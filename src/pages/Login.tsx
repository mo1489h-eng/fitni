import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, TrendingUp, Users, CreditCard, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const benefits = [
  { icon: Users, text: "إدارة عملاء احترافية" },
  { icon: ClipboardList, text: "برامج تدريب ذكية" },
  { icon: CreditCard, text: "مدفوعات أونلاين آمنة" },
  { icon: CheckCircle, text: "مجاني 3 شهور كاملة" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "خطأ في تسجيل الدخول", description: "البريد أو كلمة المرور غير صحيحة", variant: "destructive" });
      setLoading(false);
      return;
    }
    // Check if user is a client — redirect to client portal
    const userId = signInData.user?.id;
    if (userId) {
      const { data: clientProfile } = await supabase.rpc("get_my_client_profile");
      if (clientProfile && clientProfile.length > 0 && clientProfile[0].portal_token) {
        navigate(`/client-portal/${clientProfile[0].portal_token}`);
        setLoading(false);
        return;
      }
    }
    navigate("/dashboard");
    setLoading(false);
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
            <p className="text-muted-foreground text-center text-sm mb-8">
              ليس لديك حساب؟{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">سجّل الآن</Link>
            </p>

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
                <button type="button" className="text-sm text-primary hover:underline font-medium">نسيت كلمة المرور؟</button>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
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
