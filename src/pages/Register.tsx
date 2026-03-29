import { useState, useMemo } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, User, Mail, Lock, Loader2, CheckCircle, Users, ClipboardList, CreditCard, Gift, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import LanguageToggle from "@/components/LanguageToggle";

const FOUNDER_LIMIT = 100;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pw: string, t: any): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length < 8) return { level: 0, label: t("auth.passwordWeak"), color: "bg-destructive" };
  let score = 0;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 1) return { level: 1, label: t("auth.passwordFair"), color: "bg-destructive" };
  if (score <= 3) return { level: 2, label: t("auth.passwordMedium"), color: "bg-amber-500" };
  return { level: 3, label: t("auth.passwordStrong"), color: "bg-primary" };
}

const Register = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; days?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [founderSpots, setFounderSpots] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const passwordStrength = useMemo(() => getPasswordStrength(password, t), [password, t]);

  const benefits = [
    { icon: Users, text: t("auth.benefits.clients") },
    { icon: ClipboardList, text: t("auth.benefits.programs") },
    { icon: CreditCard, text: t("auth.benefits.payments") },
    { icon: CheckCircle, text: t("auth.benefits.free") },
  ];

  // Fetch remaining founder spots
  useMemo(() => {
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => {
        setFounderSpots(Math.max(0, FOUNDER_LIMIT - (count ?? 0)));
      });
  }, []);

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const validateEmail = (value: string) => {
    setEmail(value);
    if (value && !emailRegex.test(value)) {
      setEmailError(t("auth.invalidEmail"));
    } else {
      setEmailError("");
    }
  };

  const validatePromo = async (code: string, forEmail?: string): Promise<{ valid: boolean; days?: number; message: string } | null> => {
    if (!code.trim()) { setPromoResult(null); return null; }
    const checkEmail = forEmail || email;
    const { data, error } = await supabase.rpc("validate_promo_code" as any, { p_code: code.trim(), p_email: checkEmail });
    const result = (data as any) || { valid: false, message: t("common.error") };
    if (error) { const errResult = { valid: false, message: t("common.error") }; setPromoResult(errResult); return errResult; }
    setPromoResult(result);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailRegex.test(email)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 8) {
      toast({ title: t("auth.passwordWeak"), variant: "destructive" });
      return;
    }

    setLoading(true);

    let validatedPromo: { valid: boolean; days?: number; message: string } | null = null;
    if (promoCode.trim()) {
      validatedPromo = await validatePromo(promoCode, email);
      if (validatedPromo && !validatedPromo.valid) { setLoading(false); return; }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });

    if (error) {
      if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
        setEmailError(isAr ? "هذا البريد مستخدم بالفعل" : "This email is already registered");
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }

    if (signUpData?.user && !signUpData.session) {
      if (validatedPromo?.valid && promoCode.trim() && signUpData.user.id) {
        await supabase.rpc("validate_and_redeem_promo" as any, {
          p_code: promoCode.trim(),
          p_email: email,
          p_trainer_id: signUpData.user.id,
        });
      }
      navigate(`/confirm-email?email=${encodeURIComponent(email)}`);
      setLoading(false);
      return;
    }

    if (signUpData?.user && signUpData.session) {
      if (validatedPromo?.valid && promoCode.trim()) {
        await supabase.rpc("validate_and_redeem_promo" as any, {
          p_code: promoCode.trim(),
          p_email: email,
          p_trainer_id: signUpData.user.id,
        });
      }
      toast({ title: validatedPromo?.valid ? validatedPromo.message : t("common.success") });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-background" dir={isAr ? "rtl" : "ltr"}>
      {/* Left Benefits Panel */}
      <div className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-sidebar ${isAr ? "border-l" : "border-r"} border-border relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top_${isAr ? "right" : "left"},hsl(var(--primary)/0.08),transparent_60%)]`} />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-3xl font-black text-primary">CoachBase</span>
          </Link>
          <h1 className="text-4xl font-black text-foreground leading-tight mb-4">
            {isAr ? "ابدأ رحلتك المهنية" : "Start Your Professional Journey"}
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            {isAr ? "انضم لمئات المدربين في السعودية" : "Join hundreds of trainers in Saudi Arabia"}
          </p>
          <div className="space-y-5">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <b.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-base text-foreground/80 font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className={`flex ${isAr ? "-space-x-2 space-x-reverse" : "-space-x-2"}`}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-9 w-9 rounded-full border-2 border-sidebar bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {String.fromCharCode(1575 + i)}
              </div>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {founderSpots !== null && founderSpots > 0
              ? t("auth.founderSpotsLeft", { count: founderSpots })
              : t("auth.first100")}
          </span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex items-center gap-3 mb-10 justify-center lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-black text-primary">CoachBase</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <div className="flex justify-end mb-4">
              <LanguageToggle />
            </div>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">{t("auth.registerTitle")}</h2>
            <p className="text-muted-foreground text-center text-sm mb-8">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">{t("auth.loginButton")}</Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">{t("auth.fullName")}</label>
                <div className="relative">
                  <User className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} strokeWidth={1.5} />
                  <Input placeholder={isAr ? "محمد أحمد" : "John Doe"} value={name} onChange={(e) => setName(e.target.value)} className={isAr ? "pr-10" : "pl-10"} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">{t("auth.email")}</label>
                <div className="relative">
                  <Mail className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} strokeWidth={1.5} />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => validateEmail(e.target.value)}
                    className={`${isAr ? "pr-10" : "pl-10"} ${emailError ? "border-destructive focus-visible:border-destructive" : ""}`}
                    dir="ltr"
                    required
                  />
                </div>
                {emailError && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" strokeWidth={1.5} />
                    <p className="text-xs text-destructive font-medium">{emailError}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">{t("auth.password")}</label>
                <div className="relative">
                  <Lock className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} strokeWidth={1.5} />
                  <Input
                    type="password"
                    placeholder={isAr ? "8 أحرف على الأقل" : "At least 8 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={isAr ? "pr-10" : "pl-10"}
                    dir="ltr"
                    required
                    minLength={8}
                  />
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= passwordStrength.level ? passwordStrength.color : "bg-border"}`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-medium ${passwordStrength.level <= 1 ? "text-destructive" : passwordStrength.level === 2 ? "text-amber-500" : "text-primary"}`}>
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  {t("auth.promoCode")}
                </label>
                <Input placeholder={isAr ? "أدخل الكود هنا" : "Enter code here"} value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoResult(null); }} dir="ltr" />
                {promoResult ? (
                  <p className={`text-xs mt-1.5 font-medium ${promoResult.valid ? "text-primary" : "text-destructive"}`}>{promoResult.message}</p>
                ) : null}
              </div>

              <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer pt-1">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="rounded border-border bg-background h-4 w-4 accent-primary mt-0.5" />
                <span>{t("auth.agreeTerms")} <Link to="/terms" target="_blank" className="text-primary hover:underline">{t("auth.terms")}</Link> {t("auth.and")} <Link to="/privacy" target="_blank" className="text-primary hover:underline">{t("auth.privacy")}</Link></span>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={loading || !agreeTerms || !!emailError}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth.registerButton")}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:text-foreground transition-colors">{t("common.returnHome")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
