import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Mail, Lock, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const features = [
  "إدارة عملائك باحترافية",
  "تتبع التقدم بالأرقام",
  "استقبال المدفوعات بسهولة",
  "برامج تدريب احترافية",
];

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      toast({ title: "تم إنشاء الحساب بنجاح", description: "يمكنك الآن تسجيل الدخول" });
      setIsSignUp(false);
      return;
    }
    if (email === "test@test.com" && password === "123456") {
      navigate("/dashboard");
    } else {
      toast({ title: "خطأ في تسجيل الدخول", description: "البريد أو كلمة المرور غير صحيحة", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding */}
      <div className="relative lg:w-[55%] bg-gradient-to-br from-[hsl(142,76%,20%)] via-[hsl(142,70%,26%)] to-[hsl(150,60%,18%)] text-[hsl(0,0%,100%)] p-8 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl bg-[hsl(0,0%,100%)]/15 backdrop-blur-sm flex items-center justify-center border border-[hsl(0,0%,100%)]/20">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="text-3xl font-black tracking-tight">مدربي</span>
          </div>

          {/* Hero text */}
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl lg:text-5xl font-black leading-tight">
              منصتك الذكية
              <br />
              لإدارة التدريب
            </h1>
            <p className="text-lg text-[hsl(0,0%,100%)]/70 leading-relaxed">
              كل ما يحتاجه المدرب الشخصي في مكان واحد. أدر عملائك، تابع تقدمهم، واستقبل مدفوعاتك بكل سهولة.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 mt-12 lg:mt-0">
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[hsl(0,0%,100%)]/15 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-[hsl(0,0%,100%)]/90 text-base">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-[hsl(0,0%,100%)]/10">
            <p className="text-sm text-[hsl(0,0%,100%)]/40">
              © ٢٠٢٦ مدربي. جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-background">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-black text-foreground">مدربي</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {isSignUp ? "أنشئ حسابك وابدأ بإدارة عملائك" : "ادخل إلى لوحة التحكم الخاصة بك"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">الاسم الكامل</label>
                <Input
                  placeholder="محمد أحمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              {isSignUp ? "إنشاء حساب" : "دخول"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isSignUp ? "لديك حساب؟ سجّل دخولك" : "ليس لديك حساب؟ أنشئ حساباً"}
            </button>
          </div>

          {!isSignUp && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">للتجربة السريعة</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmail("test@test.com");
                  setPassword("123456");
                }}
              >
                تعبئة بيانات التجربة
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
