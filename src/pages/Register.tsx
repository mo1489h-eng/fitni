import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Loader2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; days?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const validatePromo = async (code: string, forEmail?: string): Promise<{ valid: boolean; days?: number; message: string } | null> => {
    if (!code.trim()) {
      setPromoResult(null);
      return null;
    }
    const checkEmail = forEmail || email;
    const { data, error } = await supabase.rpc("validate_promo_code" as any, {
      p_code: code.trim(),
      p_email: checkEmail,
    });

    const result = (data as any) || { valid: false, message: "حدث خطأ" };
    if (error) {
      const errResult = { valid: false, message: "حدث خطأ في التحقق من الكود" };
      setPromoResult(errResult);
      return errResult;
    }
    setPromoResult(result);
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate promo before submit and use returned result directly
    let validatedPromo: { valid: boolean; days?: number; message: string } | null = null;
    if (promoCode.trim()) {
      validatedPromo = await validatePromo(promoCode, email);
      if (validatedPromo && !validatedPromo.valid) {
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      // Atomically redeem promo code if valid (handles race conditions server-side)
      if (validatedPromo?.valid && promoCode.trim()) {
        await supabase.rpc("validate_and_redeem_promo" as any, {
          p_code: promoCode.trim(),
          p_email: email,
          p_trainer_id: newUser.id,
        });
      }

      // Insert demo clients
      const demoClients = [
        { trainer_id: newUser.id, name: "أحمد الغامدي", phone: "0551234567", goal: "خسارة وزن", subscription_price: 800, week_number: 4 },
        { trainer_id: newUser.id, name: "فهد العتيبي", phone: "0559876543", goal: "بناء عضل", subscription_price: 1000, week_number: 8 },
        { trainer_id: newUser.id, name: "خالد الشمري", phone: "0553456789", goal: "لياقة عامة", subscription_price: 600, week_number: 2 },
      ];
      await supabase.from("clients").insert(demoClients);
    }

    toast({ title: validatedPromo?.valid ? validatedPromo.message : "تم إنشاء الحساب بنجاح 🎉" });
    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-sm text-primary hover:underline font-medium">العودة للرئيسية ←</Link>
      </div>
      <Link to="/" className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-xl font-black text-foreground">fitni</span>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Dumbbell className="w-4 h-4 text-primary-foreground" />
        </div>
      </Link>
      <div className="w-full max-w-sm animate-fade-in mt-16">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-foreground">fitni</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-2">إنشاء حساب جديد</h2>
        <p className="text-muted-foreground text-center text-sm mb-8">ابدأ مجاناً لمدة سنة كاملة 🎉</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">الاسم الكامل</label>
            <Input placeholder="محمد أحمد" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">البريد الإلكتروني</label>
            <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">كلمة المرور</label>
            <Input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-primary" />
              كود ترويجي (اختياري)
            </label>
            <Input
              placeholder="أدخل الكود هنا"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoResult(null);
              }}
              dir="ltr"
            />
            {promoResult ? (
              <p className={`text-xs mt-1.5 font-medium ${promoResult.valid ? "text-green-600" : "text-destructive"}`}>
                {promoResult.message}
              </p>
            ) : (
              <p className="text-xs mt-1.5 text-muted-foreground">الكود يُرسل لك شخصياً من فريق فتني</p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء حساب"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary hover:underline font-medium">
            لديك حساب؟ سجّل دخولك
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
