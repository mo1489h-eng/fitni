import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { describeSignInError } from "@/lib/auth-signin-errors";
import { TrendingUp, Eye, EyeOff } from "lucide-react";

interface MobileLoginProps {
  onLoginSuccess: () => void | Promise<void>;
}

const MobileLogin = ({ onLoginSuccess }: MobileLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const emailNorm = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password,
      });

      if (authError) {
        const { description } = describeSignInError(authError);
        if (import.meta.env.DEV) {
          console.warn("[MobileLogin] signIn error", {
            message: authError.message,
            code: authError.code,
            status: authError.status,
          });
        }
        setError(description);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if user is a trainer (has a profile)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profile) {
          await onLoginSuccess();
        } else {
          const { data: client } = await supabase
            .from("clients")
            .select("id, portal_token")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

          if (client) {
            if (client.portal_token) {
              sessionStorage.setItem("portal_token", client.portal_token);
            }
            await onLoginSuccess();
          } else {
            setError("لم يتم العثور على حساب مرتبط");
          }
        }
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-12 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <TrendingUp className="h-8 w-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">CoachBase</h1>
          <p className="mt-2 text-sm text-muted-foreground">سجّل دخولك للمتابعة</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-0 bg-card px-4 py-4 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground transition-all focus:ring-2"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-0 bg-card px-4 py-4 text-sm text-foreground outline-none ring-primary/30 placeholder:text-muted-foreground transition-all focus:ring-2"
              dir="ltr"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "جاري التسجيل..." : "تسجيل الدخول"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileLogin;
