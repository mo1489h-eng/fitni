import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dumbbell, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  clientRegistrationLooksLikeDuplicate,
  duplicateEmailToastContent,
  isEmailAlreadyRegisteredError,
} from "@/lib/auth-email-errors";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { createPaymentSession } from "@/services/payments";

const ClientRegister = () => {
  const { token: tokenFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const token = (tokenFromPath ?? searchParams.get("token") ?? "").trim();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expired, setExpired] = useState(false);
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    trainer_name: string;
    trainer_username: string | null;
    trainer_id: string;
    subscription_price: number | string | null;
    billing_cycle: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", confirmPassword: "",
  });

  useEffect(() => {
    const fetchClient = async () => {
      if (!token) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_client_by_invite_token", { p_token: token });
      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }
      const c = data[0] as {
        id: string;
        name: string;
        email: string;
        phone: string;
        trainer_name: string;
        trainer_username?: string | null;
        trainer_id?: string;
        subscription_price?: number | string | null;
        billing_cycle?: string | null;
      };
      setClientData({
        ...c,
        trainer_username: c.trainer_username ?? null,
        trainer_id: c.trainer_id ?? "",
        subscription_price: c.subscription_price ?? null,
        billing_cycle: c.billing_cycle ?? null,
      });
      setForm(f => ({ ...f, name: c.name || "", email: c.email || "", phone: c.phone || "" }));
      setLoading(false);
    };
    fetchClient();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    const email = form.email.trim().toLowerCase();
    if (!email) {
      toast({ title: "أدخل البريد الإلكتروني", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Call edge function to create auth user with exact password
      const { data: fnData, error: fnError } = await supabase.functions.invoke<{
        success?: boolean;
        code?: string;
        message?: string;
        userId?: string;
      }>("register-client-account", {
        body: {
          invite_token: token,
          email,
          password: form.password,
          name: form.name,
          phone: form.phone || undefined,
        },
      });

      if (fnError) {
        if (isEmailAlreadyRegisteredError(fnError.message ?? "")) {
          const { title, description } = await duplicateEmailToastContent(email, { preferClientLogin: true });
          toast({ title, description, variant: "destructive" });
          return;
        }
        toast({
          title: "تعذّر الاتصال بالخادم",
          description: "تحقق من الشبكة وحاول مرة أخرى.",
          variant: "destructive",
        });
        return;
      }

      if (!fnData?.success) {
        if (fnData?.code === "TOKEN_EXPIRED") {
          setExpired(true);
          return;
        }
        if (fnData?.code === "ALREADY_LINKED") {
          toast({ title: "هذا الحساب مربوط مسبقاً", description: "سجّل دخولك من صفحة تسجيل الدخول" });
          navigate("/client-login");
          return;
        }
        if (clientRegistrationLooksLikeDuplicate(fnData?.code, fnData?.message)) {
          const { title, description } = await duplicateEmailToastContent(email, { preferClientLogin: true });
          toast({ title, description, variant: "destructive" });
          return;
        }
        toast({
          title: "فشل إنشاء الحساب",
          description: fnData?.message || "تعذّر إكمال التسجيل",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Sign in with the exact same password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (signInError) {
        console.error("signIn after register failed:", signInError);
        toast({ title: "تم إنشاء حسابك بنجاح", description: "سجّل دخولك الآن" });
        navigate("/client-login");
        return;
      }

      // Step 3: Paid plans → Tap checkout; free (0) → portal
      toast({ title: "أهلاً بك! تم إنشاء حسابك بنجاح 🎉" });

      const subPrice = Number(clientData?.subscription_price ?? 0);
      const trainerId = clientData?.trainer_id?.trim() ?? "";

      if (subPrice > 0 && trainerId && clientData) {
        try {
          const billing = (clientData.billing_cycle && String(clientData.billing_cycle).trim()) || "monthly";
          const origin = getAuthSiteOrigin();
          const qs = new URLSearchParams({
            type: "client_payment",
            client_id: clientData.id,
            amount: String(subPrice),
            billing_cycle: billing,
            return: "trainee",
          });
          const { payment_url } = await createPaymentSession({
            amount: subPrice,
            description: `اشتراك تدريب — ${clientData.trainer_name || "مدربك"}`,
            redirectUrl: `${origin}/payment/callback?${qs.toString()}`,
            customer: {
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              phone: form.phone || undefined,
            },
            metadata: {
              type: "client_subscription",
              client_id: clientData.id,
              trainer_id: trainerId,
            },
          });
          window.location.assign(payment_url);
          return;
        } catch (chargeErr) {
          console.error("[ClientRegister] createPaymentSession:", chargeErr);
          toast({
            title: "تعذّر بدء الدفع",
            description:
              chargeErr instanceof Error ? chargeErr.message : "يمكنك لاحقاً إكمال الدفع من مساحة المتدرب",
            variant: "destructive",
          });
        }
      }

      const { data: profile } = await supabase.rpc("get_my_client_profile");
      if (profile && profile.length > 0 && profile[0].portal_token) {
        navigate(`/client-portal/${profile[0].portal_token}`);
      } else {
        navigate("/client-login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (isEmailAlreadyRegisteredError(message)) {
        const { title, description } = await duplicateEmailToastContent(email, { preferClientLogin: true });
        toast({ title, description, variant: "destructive" });
      } else {
        toast({ title: "حدث خطأ", description: message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-light" />
      </div>
    );
  }

  // Token expired state
  if (expired) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-black">انتهت صلاحية الرابط</h1>
          <p className="text-muted-foreground">تواصل مع مدربك لإعادة إرسال رابط الدعوة</p>
          <div className="flex flex-col gap-2">
            <Link to="/client-login">
              <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                تسجيل الدخول
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!clientData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-black">رابط غير صالح</h1>
          <p className="text-muted-foreground">هذا الرابط غير صالح أو تم استخدامه مسبقاً</p>
          <Link to="/client-login">
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              دخول المتدرب
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-black">CoachBase</span>
          </Link>
          <Link to="/client-login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs">
              عندي حساب
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black inline-flex items-center justify-center gap-2">
              <Dumbbell className="w-7 h-7 text-primary-light" />أنشئ حسابك
            </h1>
            <p className="text-muted-foreground">
              ابدأ رحلتك مع <span className="text-primary-light font-bold">{clientData.trainer_name}</span>
            </p>
          </div>

          <Card className="bg-card border-border p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">الاسم الكامل</label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" placeholder="اسمك الكامل" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">رقم الجوال</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" placeholder="05XXXXXXXX" type="tel" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">البريد الإلكتروني</label>
                <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" placeholder="email@example.com" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">كلمة المرور</label>
                <div className="relative">
                  <Input required type={showPassword ? "text" : "password"} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pl-10"
                    placeholder="6 أحرف على الأقل" dir="ltr" minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">تأكيد كلمة المرور</label>
                <Input required type="password" value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="أعد كتابة كلمة المرور" dir="ltr" minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary-hover text-primary-foreground text-base py-6" disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء حسابي ←"}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            عندك حساب؟{" "}
            <Link to="/client-login" className="text-primary-light hover:underline">دخول</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ClientRegister;
