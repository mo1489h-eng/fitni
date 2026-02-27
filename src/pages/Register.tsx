import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

    // Insert demo clients for new trainer
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      const demoClients = [
        { trainer_id: newUser.id, name: "أحمد الغامدي", phone: "0551234567", goal: "خسارة وزن", subscription_price: 800, week_number: 4 },
        { trainer_id: newUser.id, name: "فهد العتيبي", phone: "0559876543", goal: "بناء عضل", subscription_price: 1000, week_number: 8 },
        { trainer_id: newUser.id, name: "خالد الشمري", phone: "0553456789", goal: "لياقة عامة", subscription_price: 600, week_number: 2 },
      ];
      await supabase.from("clients").insert(demoClients);
    }

    toast({ title: "تم إنشاء الحساب بنجاح 🎉" });
    navigate("/dashboard");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-black text-foreground">مدربي</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-2">إنشاء حساب جديد</h2>
        <p className="text-muted-foreground text-center text-sm mb-8">ابدأ تجربتك المجانية لمدة 14 يوم</p>

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
