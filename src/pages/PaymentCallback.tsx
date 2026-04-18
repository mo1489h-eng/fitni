import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { invokeEdgeFunction } from "@/lib/edgeFunctionInvoke";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { COACH_DASHBOARD, TRAINEE_HOME } from "@/lib/app-routes";
import { TRAINEE_INVITE_POSTPAY_STORAGE_KEY } from "@/lib/traineeInvitePostPayStorage";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const tapId = searchParams.get("tap_id");
    const type = searchParams.get("type");

    if (!tapId) {
      setStatus("error");
      setErrorMsg("لم يتم العثور على معرف الدفع");
      return;
    }

    verifyPayment(tapId, type || "");
  }, []);

  const verifyPayment = async (tapId: string, type: string) => {
    try {
      if (type === "trainer_subscription") {
        const plan = searchParams.get("plan") || "basic";
        
        // Retry logic - Tap redirect may arrive before session is fully ready
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
              "verify-payment",
              { payment_id: tapId, plan },
            );
            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || "فشل التحقق");
            
            setStatus("success");
            const planName = plan === "basic" ? "أساسي" : "احترافي";
            toast({ title: "تم الترقية بنجاح 🎉", description: `تم تفعيل باقة ${planName}` });
            setTimeout(() => navigate(COACH_DASHBOARD), 2000);
            return;
          } catch (e: any) {
            lastError = e;
            // If unauthorized, wait and retry (session may not be ready yet)
            if (attempt < 2 && (e.message?.includes("Unauthorized") || e.message?.includes("Invalid token"))) {
              await new Promise(r => setTimeout(r, 1500));
              continue;
            }
            // If payment already used (409), treat as success
            if (e.message?.includes("Payment already used")) {
              setStatus("success");
              toast({ title: "تم الترقية بنجاح 🎉" });
              setTimeout(() => navigate(COACH_DASHBOARD), 2000);
              return;
            }
            throw e;
          }
        }
        throw lastError || new Error("فشل التحقق");

      } else if (type === "trainee_registration") {
        const { data, error } = await invokeEdgeFunction<{
          success?: boolean;
          error?: string;
          email?: string;
          idempotent?: boolean;
        }>("complete-trainee-registration-payment", { payment_id: tapId });
        if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "فشل التحقق");

        let creds: { email?: string; password?: string } = {};
        try {
          const raw = sessionStorage.getItem(TRAINEE_INVITE_POSTPAY_STORAGE_KEY);
          if (raw) creds = JSON.parse(raw) as { email?: string; password?: string };
        } catch {
          /* ignore */
        }
        sessionStorage.removeItem(TRAINEE_INVITE_POSTPAY_STORAGE_KEY);

        const em = (data.email ?? creds.email ?? "").trim();
        const pw = creds.password;
        if (em && pw) {
          const { error: signErr } = await supabase.auth.signInWithPassword({ email: em, password: pw });
          if (signErr) {
            console.warn("[PaymentCallback] trainee_registration sign-in:", signErr.message);
            toast({
              title: "تم الدفع والتسجيل",
              description: "سجّل دخولك يدوياً ببريدك وكلمة المرور.",
            });
            setTimeout(() => navigate("/client-login"), 2500);
            return;
          }
        }

        setStatus("success");
        toast({ title: "تم الدفع وإنشاء حسابك بنجاح 🎉" });
        setTimeout(() => navigate(TRAINEE_HOME), 2000);

      } else if (type === "client_payment") {
        const clientId = searchParams.get("client_id");
        const amount = searchParams.get("amount");
        const billingCycle = searchParams.get("billing_cycle") || "monthly";
        const returnTo = searchParams.get("return") || "";
        const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
          "verify-client-payment",
          { payment_id: tapId, client_id: clientId, amount: Number(amount), billing_cycle: billingCycle },
        );
        if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "فشل التحقق");
        setStatus("success");
        toast({ title: "تم الدفع بنجاح" });
        if (returnTo === "trainee") {
          setTimeout(() => navigate(TRAINEE_HOME), 2000);
        } else {
          setTimeout(() => navigate(`/clients/${clientId}`), 2000);
        }

      } else if (type === "package_purchase") {
        const packageId = searchParams.get("package_id");
        const checkoutToken = searchParams.get("checkout_token");
        const rawReferralCode = sessionStorage.getItem("referral_code");
        // Sanitize: only allow alphanumeric hex codes (max 24 chars)
        const referralCode = rawReferralCode && /^[a-f0-9]{1,24}$/i.test(rawReferralCode.trim()) ? rawReferralCode.trim() : null;
        const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
          "verify-package-payment",
          {
            payment_id: tapId,
            package_id: packageId,
            checkout_token: checkoutToken,
            referral_code: referralCode,
          },
        );
        if (rawReferralCode) sessionStorage.removeItem("referral_code");
        if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "فشل التحقق");
        setStatus("success");
        toast({ title: "تم الدفع بنجاح" });

        const regContext = sessionStorage.getItem("tap_register_context");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (regContext) {
          const ctx = JSON.parse(regContext) as { username?: string };
          sessionStorage.removeItem("tap_register_context");
          navigate(`/t/${ctx.username}?step=register&payment_id=${tapId}&package_id=${packageId}`);
        } else if (session?.user) {
          setTimeout(() => navigate(TRAINEE_HOME), 2000);
        } else {
          setTimeout(() => navigate("/"), 2000);
        }

      } else if (type === "renewal") {
        const clientId = searchParams.get("client_id");
        const packageId = searchParams.get("package_id");
        const amount = searchParams.get("amount");
        const billingCycle = searchParams.get("billing_cycle") || "monthly";
        const portalToken = searchParams.get("portal_token");
        const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
          "renew-subscription",
          {
            payment_id: tapId,
            client_id: clientId,
            package_id: packageId,
            amount: Number(amount),
            billing_cycle: billingCycle,
            portal_token: portalToken,
          },
        );
        if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "فشل التحقق");
        setStatus("success");
        toast({ title: "تم تجديد اشتراكك بنجاح" });
        setTimeout(() => navigate("/portal/subscription"), 2000);

      } else if (type === "marketplace") {
        const listingId = searchParams.get("listing_id");
        const { data, error } = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
          "public-purchase",
          { listing_id: listingId, payment_id: tapId },
        );
        if (error || !data?.success) throw new Error(error?.message ?? data?.error ?? "فشل التحقق");
        setStatus("success");
        toast({ title: "تم الشراء بنجاح" });
        setTimeout(() => navigate("/store"), 2000);

      } else {
        throw new Error("نوع دفع غير معروف");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "حدث خطأ في التحقق");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-sm w-full p-8 text-center space-y-4">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">جاري التحقق من الدفع...</h2>
            <p className="text-sm text-muted-foreground">لا تغلق هذه الصفحة</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">تم الدفع بنجاح ✅</h2>
            <p className="text-sm text-muted-foreground">جاري تحويلك...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">فشل التحقق</h2>
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button onClick={() => navigate("/subscription")} variant="outline" className="mt-4">
              العودة للاشتراك
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentCallback;
