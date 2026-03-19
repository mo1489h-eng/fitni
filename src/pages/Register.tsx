import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, User, Phone, Mail, Lock, MapPin, Loader2, CheckCircle, Users, ClipboardList, CreditCard, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const benefits = [
  { icon: Users, text: "إدارة عملاء احترافية" },
  { icon: ClipboardList, text: "برامج تدريب ذكية" },
  { icon: CreditCard, text: "مدفوعات أونلاين آمنة" },
  { icon: CheckCircle, text: "مجاني 6 شهور كاملة" },
];

const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "أخرى"];

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; days?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const validatePromo = async (code: string, forEmail?: string): Promise<{ valid: boolean; days?: number; message: string } | null> => {
    if (!code.trim()) { setPromoResult(null); return null; }
    const checkEmail = forEmail || email;
    const { data, error } = await supabase.rpc("validate_promo_code" as any, { p_code: code.trim(), p_email: checkEmail });
    const result = (data as any) || { valid: false, message: "حدث خطأ" };
    if (error) { const errResult = { valid: false, message: "حدث خطأ في التحقق من الكود" }; setPromoResult(errResult); return errResult; }
    setPromoResult(result);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let validatedPromo: { valid: boolean; days?: number; message: string } | null = null;
    if (promoCode.trim()) {
      validatedPromo = await validatePromo(promoCode, email);
      if (validatedPromo && !validatedPromo.valid) { setLoading(false); return; }
    }

    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setLoading(false); return; }

    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      if (validatedPromo?.valid && promoCode.trim()) {
        await supabase.rpc("validate_and_redeem_promo" as any, { p_code: promoCode.trim(), p_email: email, p_trainer_id: newUser.id });
      }
      const demoClients = [
        { trainer_id: newUser.id, name: "أحمد الغامدي", phone: "0551234567", goal: "خسارة وزن", subscription_price: 800, week_number: 4 },
        { trainer_id: newUser.id, name: "فهد العتيبي", phone: "0559876543", goal: "بناء عضل", subscription_price: 1000, week_number: 8 },
        { trainer_id: newUser.id, name: "خالد الشمري", phone: "0553456789", goal: "لياقة عامة", subscription_price: 600, week_number: 2 },
      ];
      await supabase.from("clients").insert(demoClients);
    }

    toast({ title: validatedPromo?.valid ? validatedPromo.message : "تم إنشاء الحساب بنجاح" });
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
            <span className="text-3xl font-black text-primary">fitni</span>
          </Link>
          <h1 className="text-4xl font-black text-foreground leading-tight mb-4">ابدأ رحلتك المهنية</h1>
          <p className="text-lg text-muted-foreground mb-12">انضم لمئات المدربين في السعودية</p>
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
          <span className="text-sm text-muted-foreground">+500 مدرب انضموا بالفعل</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 justify-center lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-black text-primary">fitni</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">إنشاء حساب جديد</h2>
            <p className="text-muted-foreground text-center text-sm mb-8">
              لديك حساب؟{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">سجّل دخولك</Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">الاسم الكامل</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input placeholder="محمد أحمد" value={name} onChange={(e) => setName(e.target.value)} className="pr-10" required />
                </div>
              </div>

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
                  <Input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" dir="ltr" required minLength={6} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  كود ترويجي (اختياري)
                </label>
                <Input placeholder="أدخل الكود هنا" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoResult(null); }} dir="ltr" />
                {promoResult ? (
                  <p className={`text-xs mt-1.5 font-medium ${promoResult.valid ? "text-primary" : "text-destructive"}`}>{promoResult.message}</p>
                ) : (
                  <p className="text-xs mt-1.5 text-muted-foreground">الكود يُرسل لك شخصياً من فريق فتني</p>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer pt-1">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="rounded border-border bg-background h-4 w-4 accent-primary mt-0.5" />
                <span>أوافق على <button type="button" className="text-primary hover:underline">الشروط</button> و<button type="button" className="text-primary hover:underline">سياسة الخصوصية</button></span>
              </label>

              <Button type="submit" className="w-full" size="lg" disabled={loading || !agreeTerms}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
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

export default Register;
