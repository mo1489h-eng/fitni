import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentSession } from "@/services/payments";
import { traineeLandingSignupData } from "@/lib/traineeAcquisition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Dumbbell, CreditCard, ArrowRight } from "lucide-react";
import { isEmailAlreadyRegisteredError, duplicateEmailToastContent } from "@/lib/auth-email-errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TrainerPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
};

/**
 * Self-service trainee checkout: /coach/:coachId (coachId = trainer user_id UUID or public username).
 * Signup → link client row → Tap payment → verify-package-payment activates subscription.
 */
export default function CoachLandingTrainee() {
  const { coachId } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPkg, setSelectedPkg] = useState<TrainerPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [tapLoading, setTapLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const isUuid = useMemo(() => (coachId ? UUID_RE.test(coachId) : false), [coachId]);

  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ["coach-landing-trainer", coachId, isUuid],
    queryFn: async () => {
      if (!coachId) return null;
      if (isUuid) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url, specialization")
          .eq("user_id", coachId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return data as { user_id: string; full_name: string; username: string | null; avatar_url?: string | null; specialization?: string | null };
      }
      const { data, error } = await supabase.rpc("get_trainer_by_username" as never, { p_username: coachId } as never);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { user_id: string; full_name: string; username: string | null; avatar_url?: string | null; specialization?: string | null } | null;
    },
    enabled: !!coachId,
  });

  const trainerUserId = trainer?.user_id;

  const { data: packages = [] } = useQuery({
    queryKey: ["coach-landing-packages", trainerUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_packages")
        .select("id, name, description, price, billing_cycle")
        .eq("trainer_id", trainerUserId!)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as TrainerPackage[];
    },
    enabled: !!trainerUserId,
  });

  const startCheckout = async () => {
    if (!selectedPkg || !trainerUserId || !fullName.trim() || !email.trim() || !phone.trim() || password.length < 6) {
      toast({ title: "أكمل الحقول", description: "الاسم والبريد والجوال وكلمة المرور (6 أحرف على الأقل)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      const { data: signUpData, error: signErr } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: { data: traineeLandingSignupData(fullName) },
      });

      if (signErr) {
        if (isEmailAlreadyRegisteredError(signErr.message)) {
          const { title, description } = await duplicateEmailToastContent(emailNorm, { preferClientLogin: true });
          toast({ title, description, variant: "destructive" });
          return;
        }
        toast({ title: "فشل التسجيل", description: signErr.message, variant: "destructive" });
        return;
      }

      if (!signUpData.user) {
        toast({ title: "فشل التسجيل", description: "لم يُرجَع مستخدم.", variant: "destructive" });
        return;
      }

      if (!signUpData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: emailNorm, password });
        if (signInErr) {
          toast({
            title: "أكمل التسجيل من بريدك",
            description: "تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول.",
          });
          return;
        }
      }

      const {
        data: { user: authedUser },
      } = await supabase.auth.getUser();
      const userId = authedUser?.id ?? signUpData.user.id;

      // Profile is auto-created by handle_new_user trigger — no RPC needed

      const { error: linkErr } = await (supabase as any).rpc("create_landing_trainee_client_for_checkout", {
        p_trainer_id: trainerUserId,
        p_package_id: selectedPkg.id,
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
      });
      if (linkErr) {
        toast({ title: "تعذّر ربطك بالمدرب", description: linkErr.message, variant: "destructive" });
        return;
      }

      const { data: sessionData, error: sessionErr } = await supabase.rpc("create_package_checkout_session", {
        p_package_id: selectedPkg.id,
        p_client_name: fullName.trim(),
        p_client_phone: phone.trim(),
        p_client_email: emailNorm,
        p_auth_user_id: userId,
      });

      const checkoutSession = Array.isArray(sessionData) ? sessionData[0] : sessionData;
      if (sessionErr || !checkoutSession?.token) {
        toast({ title: "تعذّر إنشاء جلسة الدفع", description: sessionErr?.message ?? "", variant: "destructive" });
        return;
      }

      sessionStorage.setItem(
        "tap_payment_context",
        JSON.stringify({
          type: "package_purchase",
          package_id: selectedPkg.id,
          trainer_id: trainerUserId,
          return_url: window.location.href,
        }),
      );

      setTapLoading(true);
      const { payment_url } = await createPaymentSession({
        amount: selectedPkg.price,
        currency: "SAR",
        description: `اشتراك ${selectedPkg.name} — ${trainer?.full_name ?? "CoachBase"}`,
        customer: { name: fullName.trim(), email: emailNorm, phone: phone.trim() },
        redirectUrl: `${window.location.origin}/payment/callback?type=package_purchase&package_id=${selectedPkg.id}&checkout_token=${checkoutSession.token}`,
        metadata: {
          type: "package_purchase",
          package_id: selectedPkg.id,
          checkout_token: checkoutSession.token,
          trainer_id: trainerUserId,
        },
      });
      window.location.href = payment_url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      setTapLoading(false);
    } finally {
      setLoading(false);
    }
  };

  if (trainerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trainer || !trainerUserId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background" dir="rtl">
        <Dumbbell className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">المدرب غير موجود</p>
        <Button variant="outline" asChild>
          <Link to="/">الرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b border-border bg-card p-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {trainer.avatar_url ? (
            <img src={trainer.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground">{trainer.full_name}</h1>
            {trainer.specialization && <p className="text-sm text-muted-foreground">{trainer.specialization}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {step === 1 && (
          <>
            <h2 className="text-base font-semibold">اختر الباقة</h2>
            {packages.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">لا توجد باقات متاحة حالياً</Card>
            ) : (
              packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`p-4 cursor-pointer transition-colors ${selectedPkg?.id === pkg.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedPkg(pkg)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</p>
                    </div>
                    <p className="text-lg font-black text-primary whitespace-nowrap">{pkg.price} ر.س</p>
                  </div>
                </Card>
              ))
            )}
            <Button className="w-full gap-2" disabled={!selectedPkg} onClick={() => setStep(2)}>
              متابعة
              <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {step === 2 && selectedPkg && (
          <>
            <Button variant="ghost" className="mb-2 -mr-2" onClick={() => setStep(1)}>
              ← اختر باقة أخرى
            </Button>
            <h2 className="text-base font-semibold">بياناتك</h2>
            <div className="space-y-3">
              <Input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="جوال" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input type="password" placeholder="كلمة المرور (6 أحرف على الأقل)" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              بمتابعتك توافق على إنشاء حساب متدرب مرتبط بهذا المدرب والانتقال لدفع آمن عبر Tap.
            </p>
            <Button className="w-full gap-2" onClick={() => void startCheckout()} disabled={loading || tapLoading}>
              {loading || tapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              إنشاء الحساب والدفع
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
