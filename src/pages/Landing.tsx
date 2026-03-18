import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Users, TrendingUp, CreditCard, ArrowLeft, DollarSign, Trophy, Utensils, CalendarDays, BarChart3, Menu, X, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import PublicMarketplace from "@/components/PublicMarketplace";
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Scroll reveal hook ─── */
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
};

const RevealSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const Landing = () => {
  const { user, loading } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen text-white overflow-hidden relative" dir="rtl" style={{ background: "#080808" }}>
      {/* ━━━ Noise texture overlay ━━━ */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.025, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* ━━━ NAVBAR ━━━ */}
      <header className="fixed top-0 inset-x-0 z-50" style={{ background: "rgba(8,8,8,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between" style={{ height: 64 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#16a34a] flex items-center justify-center" style={{ boxShadow: "0 0 20px rgba(22,163,74,0.3)" }}>
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>fitni</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: "المميزات", href: "#features" },
              { label: "الأسعار", href: "#pricing" },
            ].map(l => (
              <a key={l.href} href={l.href} className="relative group" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
                {l.label}
                <span className="absolute -bottom-1 right-0 w-full h-px bg-[#22c55e] origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/client-login">
              <button style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", padding: "8px 16px", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
                دخول المتدرب
              </button>
            </Link>
            <Link to="/login">
              <button style={{
                background: "#16a34a", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 13, color: "#fff", border: "none", cursor: "pointer", transition: "box-shadow 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 24px rgba(22,163,74,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                دخول المدرب
              </button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden px-4 pb-4 space-y-3" style={{ background: "rgba(8,8,8,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Link to="/login" className="block" onClick={() => setMobileMenu(false)}>
              <button className="w-full text-center py-3 rounded-xl text-white font-bold" style={{ background: "#16a34a", fontSize: 14 }}>دخول المدرب</button>
            </Link>
            <Link to="/client-login" className="block" onClick={() => setMobileMenu(false)}>
              <button className="w-full text-center py-3 rounded-xl font-bold" style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontSize: 14, background: "transparent" }}>دخول المتدرب</button>
            </Link>
          </div>
        )}
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className="relative flex items-center justify-center px-4" style={{ minHeight: "100vh" }}>
        {/* Background effects */}
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 800px 600px at 50% 0%, rgba(22,163,74,0.12) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 z-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8 pt-16">
          {/* Badge */}
          <RevealSection>
            <div className="inline-flex items-center gap-2 rounded-full" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.3)", padding: "6px 16px", fontSize: 12, color: "#22c55e" }}>
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              المنصة #1 للمدربين في السعودية
            </div>
          </RevealSection>

          {/* Headline */}
          <RevealSection delay={0.1}>
            <h1 style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 900, letterSpacing: -2, lineHeight: 1.1 }}>
              أنت تبني أجساداً —{" "}
              <span style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                نحن نبني مسيرتك
              </span>
            </h1>
          </RevealSection>

          <RevealSection delay={0.2}>
            <p style={{ fontSize: "clamp(16px, 3vw, 24px)", color: "rgba(255,255,255,0.4)", fontWeight: 300, letterSpacing: 1, fontFamily: "'Inter', sans-serif" }} dir="ltr">
              You build bodies. We build your career.
            </p>
          </RevealSection>

          <RevealSection delay={0.3}>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, maxWidth: 640, margin: "0 auto" }}>
              المنصة الأولى للمدربين الشخصيين في السعودية — أدر عملاءك، تابع تقدمهم، ونظّم مدفوعاتك باحترافية
            </p>
          </RevealSection>

          {/* CTAs */}
          <RevealSection delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <button className="active:scale-[0.97]" style={{
                  height: 52, padding: "0 32px", background: "linear-gradient(135deg, #16a34a, #0d7a38)", borderRadius: 14, fontSize: 15, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(22,163,74,0.35)", transition: "all 0.2s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(22,163,74,0.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(22,163,74,0.35)"; }}>
                  ابدأ مجاناً — 6 شهور ←
                </button>
              </Link>
              <Link to="/client-login">
                <button className="active:scale-[0.97]" style={{
                  height: 52, padding: "0 32px", background: "transparent", borderRadius: 14, fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.7)", cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.12)", transition: "all 0.2s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(22,163,74,0.5)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                  دخول المتدرب 💪
                </button>
              </Link>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 12 }}>بدون بطاقة ائتمان • 6 شهور مجاناً للمدربين</p>
          </RevealSection>

          {/* Quick benefits */}
          <RevealSection delay={0.5}>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4 pt-8">
              {[
                "مجاني لأول 6 أشهر",
                "بدون بطاقة ائتمان",
                "ابدأ خلال دقيقتين",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-2 rounded-2xl px-5 py-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>{item}</span>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ━━━ Section divider ━━━ */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.3), transparent)" }} />

      {/* ━━━ WHY FITNI ━━━ */}
      <section className="px-4 relative" style={{ padding: "80px 16px" }} id="features">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#16a34a", textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter', sans-serif" }} dir="ltr">WHY FITNI</div>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900 }}>
                لماذا <span style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>fitni</span>؟
              </h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Dumbbell, titleAr: "وفّر 3 ساعات يومياً", titleEn: "Save 3 hours daily", desc: "أتمت إدارة عملائك" },
              { icon: TrendingUp, titleAr: "تابع التقدم لحظياً", titleEn: "Real-time tracking", desc: "قياسات وتقارير فورية" },
              { icon: DollarSign, titleAr: "لا تخسر ريال واحد", titleEn: "Never miss a payment", desc: "تنبيهات مدفوعات ذكية" },
              { icon: Trophy, titleAr: "كن الأفضل", titleEn: "Be the best trainer", desc: "تميّز عن منافسيك" },
            ].map((item, i) => (
              <RevealSection key={item.titleEn} delay={0.1 * i}>
                <div
                  className="group rounded-2xl p-6 transition-all duration-[250ms] cursor-default"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(22,163,74,0.4)";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(22,163,74,0.08)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)" }}>
                    <item.icon className="w-5 h-5" style={{ color: "#22c55e" }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{item.titleAr}</h3>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontFamily: "'Inter', sans-serif", marginBottom: 8 }} dir="ltr">{item.titleEn}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.3), transparent)" }} />

      {/* ━━━ FEATURES ━━━ */}
      <section className="px-4" style={{ padding: "80px 16px" }}>
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="text-center mb-14">
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#16a34a", textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter', sans-serif" }} dir="ltr">FEATURES</div>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900 }}>
                كل ما تحتاجه في{" "}
                <span style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>منصة واحدة</span>
              </h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: Users, titleAr: "إدارة العملاء", titleEn: "Smart Client Management", descEn: "Track progress, manage subscriptions, and keep all client data organized in one powerful dashboard." },
              { icon: Dumbbell, titleAr: "برامج التدريب", titleEn: "Custom Training Programs", descEn: "Build personalized workout plans with exercises, sets, reps and share them instantly with clients." },
              { icon: Utensils, titleAr: "الخطط الغذائية", titleEn: "Nutrition Planning", descEn: "Create detailed meal plans with macro tracking and assign them to specific clients effortlessly." },
              { icon: CreditCard, titleAr: "المدفوعات", titleEn: "Payment Tracking", descEn: "Never miss a payment. Automatic alerts for expiring subscriptions and overdue payments." },
              { icon: CalendarDays, titleAr: "التقويم", titleEn: "Training Calendar", descEn: "Visual monthly calendar showing all client sessions at a glance with color-coded schedules." },
              { icon: BarChart3, titleAr: "التقارير", titleEn: "Analytics & Reports", descEn: "Detailed insights into your business growth, client activity, and revenue performance." },
            ].map((f, i) => (
              <RevealSection key={f.titleEn} delay={0.1 * i}>
                <div
                  className="group rounded-2xl p-7 transition-all duration-[250ms] cursor-default relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(22,163,74,0.4)";
                    e.currentTarget.style.boxShadow = "0 0 40px rgba(22,163,74,0.08)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderLeftWidth = "2px";
                    e.currentTarget.style.borderLeftColor = "#16a34a";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderLeftWidth = "1px";
                    e.currentTarget.style.borderLeftColor = "rgba(255,255,255,0.07)";
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-200" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)" }}>
                    <f.icon className="w-6 h-6" style={{ color: "#22c55e" }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{f.titleAr}</h3>
                  <p style={{ fontSize: 11, color: "rgba(34,197,94,0.6)", letterSpacing: 1, fontWeight: 500, fontFamily: "'Inter', sans-serif", marginBottom: 10 }} dir="ltr">{f.titleEn}</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }} dir="ltr">{f.descEn}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.3), transparent)" }} />

      {/* ━━━ PRICING ━━━ */}
      <section className="px-4 relative" style={{ padding: "80px 16px" }} id="pricing">
        <div className="max-w-3xl mx-auto relative z-10">
          <RevealSection>
            <div className="text-center mb-14">
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#16a34a", textTransform: "uppercase", marginBottom: 12, fontFamily: "'Inter', sans-serif" }} dir="ltr">PRICING</div>
              <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900 }}>
                أسعار{" "}
                <span style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>بسيطة</span>
              </h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <RevealSection delay={0.1}>
              <div className="rounded-2xl p-7 text-center space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)", color: "#22c55e" }}>
                  🎁 ابدأ مجاناً
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>6 شهور مجاناً</h3>
                <div className="tabular-nums" style={{ fontSize: 52, fontWeight: 900, color: "#22c55e", fontFamily: "'Inter', sans-serif" }}>
                  0 <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>ر.س</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>ابدأ بدون أي تكلفة — كل المميزات متاحة</p>
                <ul className="space-y-3 text-right">
                  {["عدد عملاء غير محدود", "برامج تدريب وتغذية", "بوابة عملاء احترافية", "تقارير ومتابعة مدفوعات"].map(f => (
                    <li key={f} className="flex items-center gap-2" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <button className="w-full active:scale-[0.97]" style={{
                    height: 48, background: "linear-gradient(135deg, #16a34a, #0d7a38)", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                    boxShadow: "0 8px 32px rgba(22,163,74,0.35)", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(22,163,74,0.45)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(22,163,74,0.35)"; }}>
                    ابدأ مجاناً ←
                  </button>
                </Link>
              </div>
            </RevealSection>

            {/* Pro */}
            <RevealSection delay={0.2}>
              <div className="rounded-2xl p-7 text-center space-y-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(8,8,8,0))", border: "1px solid rgba(22,163,74,0.5)" }}>
                {/* Popular badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ background: "#16a34a", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: "0 0 10px 10px" }}>
                  الأكثر شيوعاً
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2" style={{ background: "rgba(22,163,74,0.2)", border: "1px solid rgba(22,163,74,0.3)", color: "#22c55e" }}>
                  ⚡ احترافي
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>الباقة الاحترافية</h3>
                <div className="tabular-nums" style={{ fontSize: 52, fontWeight: 900, color: "#22c55e", fontFamily: "'Inter', sans-serif" }}>
                  49 <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>ر.س/شهر</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>بعد انتهاء الفترة المجانية</p>
                <ul className="space-y-3 text-right">
                  {["كل مميزات الفترة المجانية", "براندينج وشعار خاص", "سوق البرامج", "دعم أولوية"].map(f => (
                    <li key={f} className="flex items-center gap-2" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block">
                  <button className="w-full active:scale-[0.97]" style={{
                    height: 48, background: "transparent", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#22c55e", cursor: "pointer",
                    border: "1px solid rgba(22,163,74,0.5)", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(22,163,74,0.1)"; e.currentTarget.style.borderColor = "#22c55e"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(22,163,74,0.5)"; }}>
                    ابدأ التجربة المجانية
                  </button>
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.3), transparent)" }} />

      {/* Public Marketplace */}
      <PublicMarketplace />

      {/* ━━━ FINAL CTA ━━━ */}
      <section className="px-4 relative" style={{ padding: "96px 16px" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(22,163,74,0.1), transparent)" }} />
        <RevealSection>
          <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6">
            <h2 style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 900 }}>
              جاهز{" "}
              <span style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>تبدأ</span>؟
            </h2>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", letterSpacing: 1, fontFamily: "'Inter', sans-serif" }} dir="ltr">Start your journey today</p>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.8 }}>انضم لمئات المدربين اللي طوّروا عملهم مع fitni</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link to="/register">
                <button className="active:scale-[0.97]" style={{
                  height: 56, padding: "0 40px", background: "linear-gradient(135deg, #16a34a, #0d7a38)", borderRadius: 16, fontSize: 17, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(22,163,74,0.35)", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(22,163,74,0.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(22,163,74,0.35)"; }}>
                  ابدأ كمدرب — مجاناً ←
                </button>
              </Link>
              <Link to="/client-login">
                <button className="active:scale-[0.97]" style={{
                  height: 56, padding: "0 40px", background: "transparent", borderRadius: 16, fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.7)", cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.12)", transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(22,163,74,0.5)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
                  دخول المتدرب 💪
                </button>
              </Link>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>بدون بطاقة ائتمان • 6 شهور مجاناً</p>
          </div>
        </RevealSection>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-4" style={{ padding: "48px 16px 24px" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Logo col */}
            <div className="col-span-2 md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#16a34a] flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <span style={{ fontWeight: 900, color: "#fff" }}>fitni</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>منصة المدرب الشخصي الأولى في السعودية</p>
            </div>
            {/* Links */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>روابط</h4>
              <div className="space-y-2">
                {["المميزات", "الأسعار", "سوق البرامج"].map(l => (
                  <a key={l} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.4)", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>قانوني</h4>
              <div className="space-y-2">
                {["سياسة الخصوصية", "الشروط والأحكام"].map(l => (
                  <a key={l} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.4)", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>تواصل</h4>
              <div className="space-y-2">
                {["الدعم", "تويتر", "إنستقرام"].map(l => (
                  <a key={l} href="#" style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.4)", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>{l}</a>
                ))}
              </div>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>© 2026 fitni. جميع الحقوق محفوظة</p>
            <div className="flex gap-6" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'Inter', sans-serif" }}>
              <span>Privacy</span>
              <span>Terms</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
