import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dumbbell, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ClientRegister = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clientData, setClientData] = useState<{
    id: string; name: string; email: string; phone: string; trainer_name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", confirmPassword: "",
  });

  useEffect(() => {
    const fetchClient = async () => {
      console.log("[ClientRegister] useParams token:", token, "type:", typeof token, "length:", token?.length);
      if (!token) {
        console.warn("[ClientRegister] No token in URL — expected /client-register/:token");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_client_by_invite_token", { p_token: token });
      console.log("[ClientRegister] get_client_by_invite_token", { data, error });
      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }
      const c = data[0];
      setClientData(c);
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
      console.log("[ClientRegister] submit — invite token:", token, "email:", email);

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

      console.log("[ClientRegister] register-client-account raw:", { fnData, fnError });

      if (fnError) {
        console.error("[ClientRegister] Edge Function invoke error (full):", fnError);
        console.error(
          "[ClientRegister] invoke error serialized:",
          JSON.stringify(fnError, Object.getOwnPropertyNames(fnError))
        );
      }

      let userId: string | null = null;
      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;

      if (!fnError && fnData?.success && fnData.userId) {
        console.log("[ClientRegister] Server created confirmed user; signing in…", fnData.userId);
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        console.log("[ClientRegister] signIn after server create:", { signInData, signInError });
        if (signInError) {
          console.error("[ClientRegister] signIn error (full):", signInError);
          throw signInError;
        }
        userId = signInData.user?.id ?? null;
        session = signInData.session ?? null;
      } else if (!fnError && fnData?.code === "USER_EXISTS") {
        console.log("[ClientRegister] USER_EXISTS — signIn + link_client_account");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        console.log("[ClientRegister] signIn (existing user):", { signInData, signInError });
        if (signInError) throw signInError;
        userId = signInData.user?.id ?? null;
        session = signInData.session ?? null;
        const { error: linkError } = await supabase.rpc("link_client_account", {
          p_invite_token: token!,
          p_auth_user_id: userId!,
        });
        console.log("[ClientRegister] link_client_account:", { linkError });
        if (linkError) throw linkError;
      } else if (!fnError && fnData && !fnData.success) {
        console.warn("[ClientRegister] register-client-account declined:", fnData);
        throw new Error(fnData.message || fnData.code || "Registration failed");
      } else if (fnError || !fnData?.success) {
        console.warn("[ClientRegister] Falling back to supabase.auth.signUp (Edge Function unavailable or failed)");
        const redirectTo = `${window.location.origin}/client-login`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: { full_name: form.name, is_client: true },
            emailRedirectTo: redirectTo,
          },
        });
        console.log("[ClientRegister] signUp fallback result:", { signUpData, signUpError });
        if (signUpError) {
          console.error("[ClientRegister] signUp error (full):", signUpError);
          console.error(
            "[ClientRegister] signUp error serialized:",
            JSON.stringify(signUpError, Object.getOwnPropertyNames(signUpError))
          );
        }

        userId = signUpData.user?.id ?? null;
        session = signUpData.session ?? null;

        if (signUpError) {
          const msg = (signUpError.message ?? "").toLowerCase();
          const duplicate =
            msg.includes("already") ||
            msg.includes("registered") ||
            msg.includes("exists") ||
            (signUpError as { code?: string }).code === "user_already_exists";

          if (duplicate) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password: form.password,
            });
            console.log("[ClientRegister] signIn after duplicate signUp:", { signInData, signInError });
            if (signInError) throw signInError;
            userId = signInData.user?.id ?? null;
            session = signInData.session ?? null;
          } else {
            throw signUpError;
          }
        }

        if (!userId) {
          console.error("[ClientRegister] No user id after signUp — often means email confirmation required (user not active until confirm).");
          throw new Error(
            "تعذر إنشاء الحساب. إن كان تأكيد البريد مفعّلاً في Supabase، عطّله أو انشر دالة register-client-account."
          );
        }

        const { error: linkError } = await supabase.rpc("link_client_account", {
          p_invite_token: token!,
          p_auth_user_id: userId,
        });
        console.log("[ClientRegister] link_client_account (fallback):", { linkError });
        if (linkError) throw linkError;
      }

      if (!userId) {
        throw new Error("تعذر إنشاء الحساب.");
      }

      toast({ title: "تم إنشاء حسابك وربطه بملفك بنجاح" });

      const activeSession = session ?? (await supabase.auth.getSession()).data.session;
      console.log("[ClientRegister] active session after flow:", !!activeSession);

      if (activeSession) {
        const { data: profile } = await supabase.rpc("get_my_client_profile");
        if (profile && profile.length > 0 && profile[0].portal_token) {
          navigate(`/client-portal/${profile[0].portal_token}`);
        } else {
          navigate("/client-login");
        }
      } else {
        toast({ title: "تحقق من بريدك الإلكتروني لتفعيل الحساب ثم سجّل الدخول" });
        navigate("/client-login");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      let description = message;
      if (lower.includes("already registered") || lower.includes("user already")) {
        description = "هذا البريد مسجل مسبقاً. جرّب تسجيل الدخول.";
      } else if (lower.includes("invalid or already used invite")) {
        description = "رابط الدعوة غير صالح أو تم استخدامه. اطلب من مدربك رابطاً جديداً.";
      } else if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
        description = "البريد مسجل مسبقاً وكلمة المرور غير صحيحة. استخدم نفس كلمة المرور أو استعدها من تسجيل الدخول.";
      }
      toast({
        title: "حدث خطأ",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4ade80]" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#16a34a] flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black">رابط غير صالح</h1>
          <p className="text-white/50">هذا الرابط غير صالح أو تم استخدامه مسبقاً</p>
          <Link to="/client-login">
            <Button className="bg-[#16a34a] hover:bg-[#15803d] text-white">
              دخول المتدرب
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" dir="rtl">
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black">CoachBase</span>
          </Link>
          <Link to="/client-login">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 text-xs">
              عندي حساب
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black inline-flex items-center justify-center gap-2"><Dumbbell className="w-7 h-7 text-[#4ade80]" />أنشئ حسابك</h1>
            <p className="text-white/50">
              ابدأ رحلتك مع <span className="text-[#4ade80] font-bold">{clientData.trainer_name}</span>
            </p>
          </div>

          <Card className="bg-white/[0.04] border-white/[0.08] p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">الاسم الكامل</label>
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  placeholder="اسمك الكامل"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">رقم الجوال</label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  placeholder="05XXXXXXXX"
                  type="tel"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">البريد الإلكتروني</label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">كلمة المرور</label>
                <div className="relative">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 pl-10"
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">تأكيد كلمة المرور</label>
                <Input
                  required
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  placeholder="أعد كتابة كلمة المرور"
                  dir="ltr"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white text-base py-6"
                disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء حسابي ←"}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-white/30">
            عندك حساب؟{" "}
            <Link to="/client-login" className="text-[#4ade80] hover:underline">دخول</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ClientRegister;
