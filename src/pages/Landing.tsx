import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Users, TrendingUp, CreditCard, ArrowLeft, Clock, DollarSign, Trophy, Star, Utensils, CalendarDays, BarChart3, Zap, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Landing = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#16a34a] flex items-center justify-center shadow-lg shadow-[#16a34a]/30">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">fitni</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                تسجيل الدخول
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-[#16a34a] hover:bg-[#15803d] text-white border-0 shadow-lg shadow-[#16a34a]/20">
                ابدأ مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#16a34a]/8 via-transparent to-transparent" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-[#16a34a]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#16a34a]/3 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#16a34a]/30 bg-[#16a34a]/10 text-[#4ade80] text-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
            المنصة #1 للمدربين في السعودية
          </div>

          {/* Main headline - Arabic */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">
              أنت تبني أجساداً — <span className="text-[#4ade80]">نحن نبني مسيرتك</span>
            </h1>
          </div>

          {/* Sub-headline - English */}
          <p className="text-xl md:text-2xl text-white/40 font-light tracking-wide animate-fade-in-up" style={{ animationDelay: "0.2s", fontFamily: "'Inter', sans-serif" }} dir="ltr">
            You build bodies. We build your career.
          </p>

          {/* Description - Arabic */}
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            المنصة الأولى للمدربين الشخصيين في السعودية — أدر عملاءك، تابع تقدمهم، ونظّم مدفوعاتك باحترافية
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Link to="/register">
              <Button
                size="lg"
                className="text-lg px-10 py-7 gap-3 bg-[#16a34a] hover:bg-[#15803d] text-white border-0 rounded-2xl animate-glow-pulse shadow-2xl shadow-[#16a34a]/30"
              >
                ابدأ مجاناً 14 يوم
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-white/30 mt-4" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
              <span className="text-[#4ade80]/50 font-medium">fitni</span> — Where Excellence Begins
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 md:gap-12 pt-8 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            {[
              { num: "500+", labelAr: "مدرب نشط", labelEn: "Active Trainers", icon: Users },
              { num: "98%", labelAr: "رضا العملاء", labelEn: "Client Satisfaction", icon: TrendingUp },
              { num: "4.9", labelAr: "التقييم", labelEn: "App Rating", icon: Star },
            ].map((stat) => (
              <div key={stat.labelEn} className="text-center">
                <stat.icon className="w-5 h-5 text-[#4ade80]/60 mx-auto mb-1.5" />
                <div className="text-2xl md:text-3xl font-black text-[#4ade80]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {stat.num}
                </div>
                <div className="text-sm text-white/60 font-medium mt-1">{stat.labelAr}</div>
                <div className="text-[10px] text-white/25 mt-0.5 tracking-wider uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {stat.labelEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Motivation Section */}
      <section className="px-4 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#16a34a]/3 to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              لماذا <span className="text-[#4ade80]">fitni</span>؟
            </h2>
            <p className="text-white/30 text-sm tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
              Why choose fitni?
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Dumbbell, titleAr: "وفّر 3 ساعات يومياً", titleEn: "Save 3 hours daily", desc: "أتمت إدارة عملائك" },
              { icon: TrendingUp, titleAr: "تابع التقدم لحظياً", titleEn: "Real-time tracking", desc: "قياسات وتقارير فورية" },
              { icon: DollarSign, titleAr: "لا تخسر ريال واحد", titleEn: "Never miss a payment", desc: "تنبيهات مدفوعات ذكية" },
              { icon: Trophy, titleAr: "كن الأفضل", titleEn: "Be the best trainer", desc: "تميّز عن منافسيك" },
            ].map((item, i) => (
              <div
                key={item.titleEn}
                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-[#16a34a]/30 transition-all duration-500 animate-fade-in-up"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#16a34a]/10 border border-[#16a34a]/20 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#4ade80]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">{item.titleAr}</h3>
                <p className="text-xs text-white/30 mb-2 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
                  {item.titleEn}
                </p>
                <p className="text-sm text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              كل ما تحتاجه في <span className="text-[#4ade80]">منصة واحدة</span>
            </h2>
            <p className="text-white/30 text-sm tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
              Everything you need in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Users, titleAr: "إدارة العملاء", titleEn: "Smart Client Management", descEn: "Track progress, manage subscriptions, and keep all client data organized in one powerful dashboard." },
              { icon: Dumbbell, titleAr: "برامج التدريب", titleEn: "Custom Training Programs", descEn: "Build personalized workout plans with exercises, sets, reps and share them instantly with clients." },
              { icon: Utensils, titleAr: "الخطط الغذائية", titleEn: "Nutrition Planning", descEn: "Create detailed meal plans with macro tracking and assign them to specific clients effortlessly." },
              { icon: CreditCard, titleAr: "المدفوعات", titleEn: "Payment Tracking", descEn: "Never miss a payment. Automatic alerts for expiring subscriptions and overdue payments." },
              { icon: CalendarDays, titleAr: "التقويم", titleEn: "Training Calendar", descEn: "Visual monthly calendar showing all client sessions at a glance with color-coded schedules." },
              { icon: BarChart3, titleAr: "التقارير", titleEn: "Analytics & Reports", descEn: "Detailed insights into your business growth, client activity, and revenue performance." },
            ].map((f, i) => (
              <div
                key={f.titleEn}
                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.06] hover:border-[#16a34a]/30 transition-all duration-500 animate-fade-in-up"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#16a34a]/10 border border-[#16a34a]/20 flex items-center justify-center mb-5 group-hover:bg-[#16a34a]/20 transition-colors">
                  <f.icon className="w-7 h-7 text-[#4ade80]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{f.titleAr}</h3>
                <p className="text-xs text-[#4ade80]/60 mb-3 tracking-wide font-medium" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
                  {f.titleEn}
                </p>
                <p className="text-sm text-white/40 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
                  {f.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="px-4 py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#16a34a]/3 to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              ماذا يقول <span className="text-[#4ade80]">المدربون</span>؟
            </h2>
            <p className="text-white/30 text-sm tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
              What trainers say about us
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "أحمد الشمري",
                role: "مدرب لياقة بدنية",
                text: "fitni غيّرت طريقة شغلي تماماً. قبل كنت أضيع وقت كثير بالواتساب والجداول، الحين كل شيء منظم ومرتب.",
                stars: 5,
              },
              {
                name: "سارة القحطاني",
                role: "مدربة يوغا وتغذية",
                text: "أفضل استثمار سويته لمشروعي كمدربة. عملائي يحبون البوابة الخاصة فيهم ويتابعون برامجهم بسهولة.",
                stars: 5,
              },
              {
                name: "فهد العتيبي",
                role: "مدرب كمال أجسام",
                text: "من أول أسبوع وفّرت ساعتين يومياً. إدارة المدفوعات والتذكيرات التلقائية ريحتني بشكل كبير.",
                stars: 5,
              },
            ].map((t, i) => (
              <div
                key={t.name}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${0.15 * i}s` }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-[#facc15] fill-[#facc15]" />
                  ))}
                </div>
                {/* Review text - Arabic */}
                <p className="text-sm text-white/70 leading-relaxed mb-5">"{t.text}"</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#16a34a]/20 border border-[#16a34a]/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#4ade80]">
                      {t.name.split(" ").map((w) => w[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#16a34a]/10 to-transparent" />
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-black">
            جاهز <span className="text-[#4ade80]">تبدأ</span>؟
          </h2>
          <p className="text-xl text-white/30 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
            Start your journey today
          </p>
          <p className="text-white/50 text-lg">
            انضم لمئات المدربين اللي طوّروا عملهم مع fitni
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="text-lg px-12 py-7 gap-3 bg-[#16a34a] hover:bg-[#15803d] text-white border-0 rounded-2xl animate-glow-pulse shadow-2xl shadow-[#16a34a]/30 mt-4"
            >
              ابدأ مجاناً ←
            </Button>
          </Link>
          <p className="text-sm text-white/25" style={{ fontFamily: "'Inter', sans-serif" }} dir="ltr">
            No credit card • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#16a34a] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white">fitni</span>
          </div>
          <p className="text-sm text-white/30">© 2026 fitni. جميع الحقوق محفوظة</p>
          <div className="flex gap-6 text-xs text-white/25" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
