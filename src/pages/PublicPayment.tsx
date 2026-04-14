import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentSession } from "@/services/payments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CreditCard, Check, Dumbbell, UtensilsCrossed,
  MessageCircle, User, ArrowRight, CheckCircle, ShieldCheck,
} from "lucide-react";

const PublicPayment = () => {
  const { trainerSlug, packageId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [step, setStep] = useState<"info" | "pay">("info");

  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ["public-trainer", trainerSlug],
    queryFn: async () => {
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

  const handlePay = async () => {
    if (!selectedPkg) return;
    setLoading(true);
    setError(null);
    try {
      // Create checkout session first
      const { data: sessionData, error: sessionError } = await supabase.rpc("create_package_checkout_session", {
        p_package_id: selectedPkg.id,
        p_client_name: clientName,
        p_client_phone: clientPhone,
        p_client_email: clientEmail || null,
      });

      const checkoutSession = Array.isArray(sessionData) ? sessionData[0] : null;
      if (sessionError || !checkoutSession?.token) {
        throw new Error("فشل إنشاء جلسة الدفع الآمنة");
      }

      const referralCode = sessionStorage.getItem("referral_code");

      const { payment_url } = await createPaymentSession({
        amount: selectedPkg.price,
        currency: "SAR",
        description: `اشتراك ${selectedPkg.name} - ${trainer?.full_name}`,
        customer: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        },
        redirectUrl: `${window.location.origin}/payment/callback?type=package_purchase&package_id=${selectedPkg.id}&checkout_token=${checkoutSession.token}`,
        metadata: {
          type: "package_purchase",
          package_id: selectedPkg.id,
          checkout_token: checkoutSession.token,
          referral_code: referralCode || "",
          trainer_id: trainer?.user_id,
        },
      });

      window.location.href = payment_url;
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
      setLoading(false);
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
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
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
          {trainer.specialization && <p className="text-sm text-muted-foreground mt-1">{trainer.specialization}</p>}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {isListView && (
          <>
            <h2 className="text-lg font-bold text-foreground">الباقات المتاحة</h2>
            {packages.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">لا توجد باقات متاحة حالياً</p></Card>
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
                    {pkg.sessions_per_week > 0 && <div className="flex items-center gap-2 text-sm"><Dumbbell className="w-4 h-4 text-primary" />{pkg.sessions_per_week} جلسات أسبوعياً</div>}
                    {pkg.includes_program && <div className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />برنامج تدريب</div>}
                    {pkg.includes_nutrition && <div className="flex items-center gap-2 text-sm"><UtensilsCrossed className="w-4 h-4 text-primary" />جدول غذائي</div>}
                    {pkg.includes_followup && <div className="flex items-center gap-2 text-sm"><MessageCircle className="w-4 h-4 text-primary" />متابعة يومية</div>}
                    {(pkg.custom_features as string[] || []).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{f}</div>
                    ))}
                  </div>
                  <Button className="w-full gap-2" onClick={() => window.location.href = `${window.location.pathname}/${pkg.id}`}>
                    <CreditCard className="w-4 h-4" /> اشترك الآن
                  </Button>
                </Card>
              ))
            )}
          </>
        )}

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
              <Button className="w-full gap-2" onClick={() => setStep("pay")} disabled={!clientName.trim() || !clientPhone.trim()}>
                متابعة للدفع <ArrowRight className="w-4 h-4 rotate-180" />
              </Button>
            </Card>
          </div>
        )}

        {selectedPkg && step === "pay" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("info")}>
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>ادفع عبر Tap Payments</span>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                {["Mada", "Visa", "MC", "Apple Pay", "STC Pay"].map(m => (
                  <span key={m} className="px-2 py-1 rounded bg-secondary text-xs text-secondary-foreground border border-border">{m}</span>
                ))}
              </div>

              <div className="bg-secondary rounded-xl p-4 text-center mb-4">
                <p className="text-3xl font-black text-primary">{selectedPkg.price}</p>
                <p className="text-sm text-muted-foreground">ر.س / {cycleLabel[selectedPkg.billing_cycle]}</p>
              </div>

              <Button onClick={handlePay} disabled={loading} className="w-full h-12 gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {loading ? "جاري التحويل..." : "ادفع الآن"}
              </Button>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
              )}
            </Card>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              الدفع آمن ومشفر عبر Tap Payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPayment;
