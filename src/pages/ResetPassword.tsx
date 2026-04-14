import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type RecoveryStatus = "loading" | "ready" | "invalid";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<RecoveryStatus>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const processRecovery = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      // --- PKCE flow: ?code= parameter ---
      if (code) {
        // Strip the code from URL immediately to prevent double-use
        window.history.replaceState({}, document.title, url.pathname);

        // detectSessionInUrl may have already exchanged the code.
        // Check for an existing session first.
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (existingSession) {
          setStatus("ready");
          return;
        }

        // No session yet — try manual exchange
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error) {
          console.error("exchangeCodeForSession failed:", error.message);
          // One more check — auto-exchange may have completed after our attempt
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            setStatus("ready");
          } else {
            setStatus("invalid");
          }
          return;
        }

        setStatus("ready");
        return;
      }

      // --- Legacy implicit flow: #access_token=...&type=recovery ---
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        // Wait for Supabase client to parse the hash
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 300));
          if (cancelled) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus("ready");
            return;
          }
        }
      }

      // --- No code and no hash — check if onAuthStateChange already set a session ---
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("ready");
        return;
      }

      setStatus("invalid");
    };

    // Also listen for PASSWORD_RECOVERY event from onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    processRecovery();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "كلمة المرور قصيرة", description: "يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Verify we have an active session before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "انتهت الجلسة", description: "الرابط منتهي الصلاحية. اطلب رابطاً جديداً.", variant: "destructive" });
        setStatus("invalid");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Sign out to invalidate old session — user must login with new password
      await supabase.auth.signOut();

      toast({
        title: "تم تغيير كلمة المرور بنجاح ✅",
        description: "سجّل دخولك بكلمة المرور الجديدة",
      });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر تحديث كلمة المرور";
      toast({ title: "فشل التحديث", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <p className="text-foreground font-medium">رابط إعادة التعيين غير صالح أو انتهت صلاحيته.</p>
          <p className="text-sm text-muted-foreground">اطلب رابطاً جديداً من صفحة تسجيل الدخول.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link to="/login">دخول المدرب</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/client-login">دخول المتدرب</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جارٍ التحقق من الرابط…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-black text-primary">CoachBase</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <h1 className="text-2xl font-bold text-foreground text-center mb-2">إنشاء كلمة مرور جديدة</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">أدخل كلمة المرور الجديدة لحسابك</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10"
                    dir="ltr"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-destructive mt-1">يجب أن تكون 8 أحرف على الأقل</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">تأكيد كلمة المرور</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  dir="ltr"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-destructive mt-1">كلمتا المرور غير متطابقتين</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting || password.length < 8 || password !== confirm}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري تحديث كلمة المرور…
                  </>
                ) : (
                  "حفظ كلمة المرور"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link to="/login" className="text-primary hover:underline font-semibold">
                العودة لتسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
