import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CreditCard, Check, Dumbbell, UtensilsCrossed,
  MessageCircle, User, ArrowRight, CheckCircle,
} from "lucide-react";

const PUBLISHABLE_KEY = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const PublicPayment = () => {
  const { trainerSlug, packageId } = useParams();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [step, setStep] = useState<"info" | "pay">("info");

  // Fetch trainer profile
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ["public-trainer", trainerSlug],
    queryFn: async () => {
      // Try by username first, then by user_id
      let { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, specialization, bio")
        .eq("username", trainerSlug!)
        .maybeSingle();
      if (!data) {
        const res = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, specialization, bio")
          .eq("user_id", trainerSlug!)
          .maybeSingle();
        data = res.data;
      }
      return data;
    },
    enabled: !!trainerSlug,
  });

  // Fetch packages for this trainer
  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ["public-packages", trainer?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_packages")
        .select("*")
        .eq("trainer_id", trainer!.user_id)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!trainer?.user_id,
  });

  const selectedPkg = packageId ? packages.find((p) => p.id === packageId) : null;
  const isListView = !packageId;

  // Initialize Moyasar when on pay step
  useEffect(() => {
    if (step !== "pay" || !selectedPkg || initializedRef.current || !formRef.current) return;

    if (!document.getElementById("moyasar-css")) {
      const link = document.createElement("link");
      link.id = "moyasar-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    const loadMoyasar = () => {
      if ((window as any).Moyasar) {
        initForm();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = () => initForm();
      document.head.appendChild(script);
    };

    const initForm = () => {
      if (initializedRef.current || !formRef.current) return;
      initializedRef.current = true;

      (window as any).Moyasar.init({
        element: formRef.current,
        amount: selectedPkg.price * 100,
        currency: "SAR",
        description: `اشتراك ${selectedPkg.name} - ${trainer?.full_name}`,
        publishable_api_key: PUBLISHABLE_KEY,
        callback_url: window.location.href,
        methods: ["creditcard", "applepay"],
        apple_pay: {
          country: "SA",
          label: "CoachBase",
          validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
        },
        on_completed: async (payment: any) => {
          if (payment.status === "paid") {
            await verifyPayment(payment.id);
          } else {
            setError("لم يتم اكتمال الدفع. حاول مرة أخرى");
          }
        },
        on_failure: () => {
          setError("فشلت عملية الدفع. حاول مرة أخرى");
        },
      });
    };

    loadMoyasar();

    return () => {
      initializedRef.current = false;
    };
  }, [step, selectedPkg]);

  const verifyPayment = async (paymentId: string) => {
    setVerifying(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.rpc("create_package_checkout_session", {
        p_package_id: selectedPkg!.id,
        p_client_name: clientName,
        p_client_phone: clientPhone,
        p_client_email: clientEmail || null,
      });

      const checkoutSession = Array.isArray(sessionData) ? sessionData[0] : null;
      if (sessionError || !checkoutSession?.token) {
        throw new Error("فشل إنشاء جلسة الدفع الآمنة");
      }

      const referralCode = sessionStorage.getItem("referral_code");
      const { data, error: fnError } = await supabase.functions.invoke("verify-package-payment", {
        body: {
          payment_id: paymentId,
          package_id: selectedPkg!.id,
          checkout_token: checkoutSession.token,
          referral_code: referralCode || null,
        },
      });
      if (referralCode) sessionStorage.removeItem("referral_code");
      if (fnError || !data?.success) {
        throw new Error(data?.error || "فشل التحقق من الدفع");
      }
      setSuccess(true);
      toast({ title: "تم الدفع بنجاح" });
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setVerifying(false);
    }
  };

  const cycleLabel: Record<string, string> = {
    monthly: "شهرياً",
    quarterly: "كل 3 شهور",
    yearly: "سنوياً",
  };

  if (trainerLoading || pkgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-bold">المدرب غير موجود</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">تم الدفع بنجاح</h2>
          <p className="text-muted-foreground text-sm">
            تم تسجيلك مع المدرب {trainer.full_name}. سيتم التواصل معك قريباً.
          </p>
          <p className="text-xs text-muted-foreground">تم إرسال إيصال الدفع إلى بريدك الإلكتروني</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Trainer Header */}
      <div className="bg-card border-b border-border p-6 text-center">
        <div className="max-w-md mx-auto">
          {trainer.avatar_url ? (
            <img src={trainer.avatar_url} alt={trainer.full_name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-primary/30" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <User className="w-10 h-10 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{trainer.full_name}</h1>
          {trainer.specialization && (
            <p className="text-sm text-muted-foreground mt-1">{trainer.specialization}</p>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Package List View */}
        {isListView && (
          <>
            <h2 className="text-lg font-bold text-foreground">الباقات المتاحة</h2>
            {packages.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">لا توجد باقات متاحة حالياً</p>
              </Card>
            ) : (
              packages.map((pkg) => (
                <Card key={pkg.id} className="p-5 space-y-3">
                  <h3 className="font-bold text-lg text-card-foreground">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-primary">{pkg.price}</span>
                    <span className="text-sm text-muted-foreground">ر.س / {cycleLabel[pkg.billing_cycle]}</span>
                  </div>
                  <div className="space-y-2">
                    {pkg.sessions_per_week > 0 && (
                      <div className="flex items-center gap-2 text-sm"><Dumbbell className="w-4 h-4 text-primary" />{pkg.sessions_per_week} جلسات أسبوعياً</div>
                    )}
                    {pkg.includes_program && (
                      <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />برنامج تدريب</div>
                    )}
                    {pkg.includes_nutrition && (
                      <div className="flex items-center gap-2 text-sm"><UtensilsCrossed className="w-4 h-4 text-primary" />جدول غذائي</div>
                    )}
                    {pkg.includes_followup && (
                      <div className="flex items-center gap-2 text-sm"><MessageCircle className="w-4 h-4 text-primary" />متابعة يومية</div>
                    )}
                    {(pkg.custom_features as string[] || []).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{f}</div>
                    ))}
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => window.location.href = `${window.location.pathname}/${pkg.id}`}
                  >
                    <CreditCard className="w-4 h-4" />
                    اشترك الآن
                  </Button>
                </Card>
              ))
            )}
          </>
        )}

        {/* Single Package Payment View */}
        {selectedPkg && step === "info" && (
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-lg text-card-foreground">{selectedPkg.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{selectedPkg.price}</span>
                <span className="text-sm text-muted-foreground">ر.س / {cycleLabel[selectedPkg.billing_cycle]}</span>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="font-bold text-card-foreground">بياناتك</h3>
              <div>
                <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="أدخل اسمك" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">رقم الجوال</label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="05XXXXXXXX" type="tel" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@example.com" type="email" dir="ltr" />
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => setStep("pay")}
                disabled={!clientName.trim() || !clientPhone.trim()}
              >
                متابعة للدفع <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </Card>
          </div>
        )}

        {selectedPkg && step === "pay" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => { setStep("info"); initializedRef.current = false; }}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>ادفع بالبطاقة أو Apple Pay</span>
              </div>

              {verifying ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري التحقق من الدفع...</p>
                </div>
              ) : (
                <div ref={formRef} className="moyasar-form" />
              )}

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
              )}
            </Card>

            <p className="text-xs text-muted-foreground text-center">الدفع آمن ومشفر عبر Moyasar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPayment;
