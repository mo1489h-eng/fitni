import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Link2, Mail, Loader2, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ClientLogin = () => {
  const [portalLink, setPortalLink] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"link" | "email">("email");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePortalLink = () => {
    let token = portalLink.trim();
    const match = token.match(/client-portal\/([a-zA-Z0-9]+)/);
    if (match) token = match[1];
    if (!token || token.length < 8) {
      toast({ title: "رابط غير صالح", description: "تأكد من الرابط اللي أرسله لك مدربك", variant: "destructive" });
      return;
    }
    navigate(`/client-portal/${token}`);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.rpc("get_my_client_profile");
      if (profileError) throw profileError;
      if (profile && profile.length > 0 && profile[0].portal_token) {
        toast({ title: "أهلاً بك" });
        navigate(`/client-portal/${profile[0].portal_token}`);
      } else {
        toast({ title: "لم يتم العثور على بيانات المتدرب", description: "تواصل مع مدربك", variant: "destructive" });
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      toast({
        title: "خطأ في الدخول",
        description: err.message?.includes("Invalid login") ? "البريد أو كلمة المرور غير صحيحة" : err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "أدخل بريدك الإلكتروني أولاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "تم إرسال رابط إعادة التعيين", description: "تحقق من بريدك الإلكتروني" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] flex items-center justify-center p-4" dir="rtl">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <Dumbbell className="w-7 h-7 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">مرحباً بك</h1>
          <p className="text-sm text-[hsl(0_0%_45%)]">سجّل دخولك لمتابعة رحلتك</p>
        </div>

        {/* Card */}
        <div className="bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)] rounded-2xl p-8 space-y-6">
          {/* Toggle */}
          <div className="flex bg-[hsl(0_0%_4%)] rounded-xl p-1 border border-[hsl(0_0%_10%)]">
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "email" ? "bg-primary text-white" : "text-[hsl(0_0%_40%)] hover:text-[hsl(0_0%_60%)]"
              }`}
            >
              <Mail className="w-4 h-4" strokeWidth={1.5} />
              بالإيميل
            </button>
            <button
              onClick={() => setMode("link")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "link" ? "bg-primary text-white" : "text-[hsl(0_0%_40%)] hover:text-[hsl(0_0%_60%)]"
              }`}
            >
              <Link2 className="w-4 h-4" strokeWidth={1.5} />
              برابط خاص
            </button>
          </div>

          {mode === "email" ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(0_0%_50%)] mb-1.5 block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_30%)]" strokeWidth={1.5} />
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] text-white placeholder:text-[hsl(0_0%_25%)] pr-10 h-12 focus:border-primary/60"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(0_0%_50%)] mb-1.5 block">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_30%)]" strokeWidth={1.5} />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] text-white placeholder:text-[hsl(0_0%_25%)] pr-10 pl-10 h-12 focus:border-primary/60"
                    placeholder="كلمة المرور"
                    dir="ltr"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(0_0%_30%)] hover:text-[hsl(0_0%_50%)]">
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-[hsl(0_0%_15%)] bg-[hsl(0_0%_4%)] accent-primary" />
                  <span className="text-xs text-[hsl(0_0%_45%)]">تذكرني</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:text-primary/80 transition-colors">
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[hsl(0_0%_35%)]">الصق الرابط اللي أرسله لك مدربك عبر الواتساب</p>
              <div className="relative">
                <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0_0%_30%)]" strokeWidth={1.5} />
                <Input
                  placeholder="https://coachbase.health/client-portal/..."
                  value={portalLink}
                  onChange={e => setPortalLink(e.target.value)}
                  className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] text-white placeholder:text-[hsl(0_0%_20%)] pr-10 h-12 focus:border-primary/60"
                  onKeyDown={e => e.key === "Enter" && handlePortalLink()}
                  dir="ltr"
                />
              </div>
              <Button className="w-full h-12 text-base font-medium gap-2" onClick={handlePortalLink}>
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                دخول
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-[hsl(0_0%_30%)]">
            ما عندك حساب؟ تواصل مع مدربك ليرسل لك رابط التسجيل
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/" className="text-xs text-[hsl(0_0%_30%)] hover:text-[hsl(0_0%_50%)] transition-colors">
              الرئيسية
            </Link>
            <span className="text-[hsl(0_0%_15%)]">|</span>
            <Link to="/login" className="text-xs text-[hsl(0_0%_30%)] hover:text-[hsl(0_0%_50%)] transition-colors">
              أنا مدرب
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
