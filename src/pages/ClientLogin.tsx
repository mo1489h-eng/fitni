import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Link2, ArrowLeft, Mail, Loader2, Eye, EyeOff } from "lucide-react";
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

      // Get client profile to redirect to portal
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
      toast({ title: "تم إرسال رابط إعادة التعيين 📧", description: "تحقق من بريدك الإلكتروني" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" dir="rtl">
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black">fitni</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 text-xs">
              أنا مدرب ←
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black">أهلاً بك 💪</h1>
            <p className="text-white/50">سجّل دخولك لمتابعة تمارينك وتقدمك</p>
          </div>

          {/* Toggle */}
          <div className="flex bg-white/[0.04] rounded-xl p-1 border border-white/[0.08]">
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "email" ? "bg-[#16a34a] text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Mail className="w-4 h-4 inline-block ml-1" />
              بالإيميل
            </button>
            <button
              onClick={() => setMode("link")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === "link" ? "bg-[#16a34a] text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Link2 className="w-4 h-4 inline-block ml-1" />
              برابط خاص
            </button>
          </div>

          {mode === "email" ? (
            <Card className="bg-white/[0.04] border-white/[0.08] p-6 space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">البريد الإلكتروني</label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 pl-10"
                      placeholder="كلمة المرور"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white py-5"
                  disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول ←"}
                </Button>
              </form>
              <button onClick={handleForgotPassword} className="w-full text-center text-sm text-[#4ade80]/70 hover:text-[#4ade80]">
                نسيت كلمة المرور؟
              </button>
            </Card>
          ) : (
            <Card className="bg-white/[0.04] border-white/[0.08] p-6 space-y-4">
              <p className="text-sm text-white/40">استخدم الرابط اللي أرسله لك مدربك عبر الواتساب</p>
              <Input
                placeholder="الصق رابطك هنا..."
                value={portalLink}
                onChange={e => setPortalLink(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                onKeyDown={e => e.key === "Enter" && handlePortalLink()}
                dir="ltr"
              />
              <Button className="w-full gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white" onClick={handlePortalLink}>
                <ArrowLeft className="w-4 h-4" />
                دخول
              </Button>
            </Card>
          )}

          <div className="text-center space-y-3 pt-2">
            <p className="text-sm text-white/30">
              ما عندك حساب؟ تواصل مع مدربك ليرسل لك رابط التسجيل
            </p>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/70 text-xs">
                ← الرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientLogin;
