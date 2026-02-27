import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Users, TrendingUp, CreditCard, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const features = [
  { icon: Users, title: "إدارة العملاء", desc: "أضف عملاءك وتابع تقدمهم بسهولة مع لوحة تحكم ذكية" },
  { icon: TrendingUp, title: "تتبع التقدم", desc: "رسوم بيانية وقياسات دقيقة لكل عميل" },
  { icon: CreditCard, title: "إدارة المدفوعات", desc: "تابع الاشتراكات والمتأخرات تلقائياً" },
];

const Landing = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black text-foreground">مدربي</span>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm">تسجيل الدخول</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl lg:text-5xl font-black text-foreground leading-tight">
            أدر عملاءك باحترافية 💪
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            المنصة الذكية للمدربين الشخصيين. برامج تدريب، متابعة تقدم، ومدفوعات — كل شيء في مكان واحد.
          </p>
          <Link to="/register">
            <Button size="lg" className="text-base px-8 py-6 gap-2">
              ابدأ مجاناً 14 يوم
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">بدون بطاقة ائتمان • إلغاء في أي وقت</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-card rounded-xl p-6 border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">© ٢٠٢٦ مدربي. جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
};

export default Landing;
