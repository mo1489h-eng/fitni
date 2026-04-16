import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { PASSWORD_RESET_REDIRECT_URL } from "@/lib/auth-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, TrendingUp, Users, CreditCard, ClipboardList } from "lucide-react";
import { authLogDev } from "@/lib/auth-log";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COACH_DASHBOARD, TRAINEE_HOME } from "@/lib/app-routes";
import type { FitniRole } from "@/lib/auth-service";

const benefits = [
  { icon: Users, text: "إدارة عملاء احترافية" },
  { icon: ClipboardList, text: "برامج تدريب ذكية" },
  { icon: CreditCard, text: "مدفوعات أونلاين آمنة" },
  { icon: CheckCircle, text: "مجاني 3 شهور كاملة" },
];

const Login = () => {
  const [accountTab, setAccountTab] = useState<FitniRole>("coach");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, refreshProfile, resolvedFitniRole } = useAuth();

  if (!authLoading && user) {
    if (resolvedFitniRole === "trainee") return <Navigate to={TRAINEE_HOME} replace />;
    if (resolvedFitniRole === "coach") return <Navigate to={COACH_DASHBOARD} replace />;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emailTrim = email.trim().toLowerCase();
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password,
      });

      if (error) {
        authLogDev("login_failure", {
          message: error.message,
          status: (error as { status?: number }).status,
          code: (error as { code?: string }).code,
        });
        // Surface Supabase message verbatim (same string often used for wrong password AND unconfirmed email).
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      authLogDev("login_success", {
        userId: signInData.user?.id,
        hasSession: !!signInData.session,
        emailConfirmed: !!(signInData.user?.email_confirmed_at || signInData.user?.confirmed_at),
      });

      const userId = signInData.user?.id;
      if (userId) {
        let r = await refreshProfile();
        if (!r) {
          await new Promise((res) => setTimeout(res, 400));
          r = await refreshProfile();
        }
        if (import.meta.env.DEV) {
          console.log("[Login] resolved role:", r);
        }
        if (r) {
          if (r !== accountTab) {
            toast({
              title: r === "coach" ? "حساب مدرب" : "حساب متدرب",
              description:
                r === "coach"
                  ? "تم توجيهك إلى لوحة المدرب حسب بيانات حسابك."
                  : "تم توجيهك إلى مساحة المتدرب حسب بيانات حسابك.",
            });
          }
          navigate(r === "trainee" ? TRAINEE_HOME : COACH_DASHBOARD);
        } else {
          console.warn("[Login] resolveFitniRole returned null after retries", { userId });
          toast({
            title: "تعذّر إكمال تسجيل الدخول",
            description:
              "لم نتمكن من تحديد نوع حسابك (مدرب أو متدرب). تحقق من الشبكة ثم أعد المحاولة. إذا استمرّت المشكلة، تواصل مع الدعم.",
            variant: "destructive",
          });
        }
        if (import.meta.env.DEV) {
          const { data: after } = await supabase.auth.getSession();
          authLogDev("post_login_session", {
            hasSession: !!after.session,
            uid: after.session?.user?.id,
          });
        }
      }
    } catch (e) {
      console.error("[Login] unexpected error:", e);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: "أدخل البريد الإلكتروني",
        description: "نحتاج بريدك لإرسال رابط إعادة تعيين كلمة المرور",
        variant: "destructive",
      });
      return;
    }
    setForgotSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: PASSWORD_RESET_REDIRECT_URL,
      });
      if (error) throw error;
      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "تحقق من بريدك الإلكتروني وافتح الرابط لإنشاء كلمة مرور جديدة",
      });
      setShowForgot(false);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e);
      const m = raw.toLowerCase();
      const description =
        m.includes("rate") || m.includes("too many")
          ? "تجاوزت عدد المحاولات. انتظر قليلاً ثم حاول مرة أخرى."
          : `تعذّر إرسال الرابط: ${raw}`;
      toast({ title: "تعذّر إرسال البريد", description, variant: "destructive" });
    } finally {
      setForgotSending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Left Benefits Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-sidebar border-l border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-3xl font-black text-primary">CoachBase</span>
          </Link>
          <h1 className="text-4xl font-black text-foreground leading-tight mb-4">مرحباً بعودتك</h1>
          <p className="text-lg text-muted-foreground mb-12">سجّل دخولك وتابع إدارة عملائك</p>
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
          <div className="flex -space-x-2 space-x-reverse">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-9 w-9 rounded-full border-2 border-sidebar bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {String.fromCharCode(1575 + i)}
              </div>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">كن من أوائل 100 مدرب</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 justify-center lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-black text-primary">CoachBase</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">تسجيل الدخول</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              ليس لديك حساب؟{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">سجّل الآن</Link>
            </p>

            <div className="flex rounded-xl border border-border p-1 mb-8 bg-muted/30" role="tablist" aria-label="نوع الحساب">
              <button
                type="button"
                role="tab"
                aria-selected={accountTab === "coach"}
                onClick={() => setAccountTab("coach")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  accountTab === "coach" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                مدرب
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={accountTab === "trainee"}
                onClick={() => setAccountTab("trainee")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  accountTab === "trainee" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                متدرب
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10" dir="ltr" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="rounded border-border bg-background h-4 w-4 accent-primary" />
                  تذكرني
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    const t = email.trim();
                    if (t) void handleForgotPassword();
                    else {
                      toast({
                        title: "أدخل بريدك الإلكتروني",
                        description: "اكتب بريدك في الحقل أعلاه ثم اضغط «نسيت كلمة المرور؟» مرة أخرى لإرسال الرابط.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              {showForgot ? (
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    سنرسل رابطاً إلى بريدك لإعادة تعيين كلمة المرور.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={forgotSending || !email.trim()}
                    onClick={handleForgotPassword}
                  >
                    {forgotSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال رابط الاستعادة"}
                  </Button>
                </div>
              ) : null}

              <Button type="submit" className="w-full" size="lg" disabled={loading || forgotSending}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              إذا أنشأت حساباً للتو، قد تحتاج تأكيد البريد من الرابط المرسل قبل أول تسجيل دخول.
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:text-foreground transition-colors">العودة للرئيسية</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
