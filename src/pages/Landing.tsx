import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Card, CardContent } from "@/components/ui/card";
import { useInView, usePrefersReducedMotion } from "@/components/landing/LandingUtils";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AICopilotSection from "@/components/landing/AICopilotSection";
import AIAgentSection from "@/components/landing/AIAgentSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const socialProofStats = [
  { value: 500, suffix: "+", label: "مدرب" },
  { value: 10000, suffix: "+", label: "متدرب" },
  { value: 1, prefix: "", suffix: "M+", label: "تمرين مكتمل" },
];

const Landing = () => {
  const { user, loading } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [copilotStep, setCopilotStep] = useState(0);
  const statsInView = useInView<HTMLDivElement>(0.35);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = window.setInterval(() => setCopilotStep((c) => (c + 1) % 4), 1600);
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  const heroParallax = useMemo(() => (prefersReducedMotion ? 0 : Math.min(scrollY * 0.08, 30)), [prefersReducedMotion, scrollY]);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes landing-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-12px,0); } }
        @keyframes landing-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(50%); } }
        .landing-float { animation: landing-float 7s ease-in-out infinite; }
        .landing-marquee { animation: landing-marquee 22s linear infinite; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } .landing-float, .landing-marquee { animation: none !important; } }
      `}</style>

      <Navbar scrolled={scrolled} />

      <main>
        <HeroSection heroParallax={heroParallax} />

        <section ref={statsInView.ref} className="border-y border-border bg-card/60 px-4 py-5 backdrop-blur md:px-6">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-full border border-border bg-background/80 py-3">
            <div className="landing-marquee flex min-w-max items-center gap-16 px-8 text-sm font-semibold text-foreground/55">
              {Array.from({ length: 2 }).flatMap((_, i) =>
                ["انضم لمئات المدربين في السعودية", "لوحة تحكم احترافية للمدربين", "تجربة متدرب premium من أول يوم"].map((t) => <span key={`${t}-${i}`}>{t}</span>),
              )}
            </div>
          </div>
          <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
            {socialProofStats.map((stat) => (
              <Card key={stat.label} className="border-border bg-background/70 backdrop-blur">
                <CardContent className="flex items-end justify-between gap-4 p-6">
                  <div>
                    <div className="text-sm text-foreground/45">{stat.label}</div>
                    <div className="mt-3 text-4xl font-black text-foreground md:text-5xl">
                      {statsInView.visible ? <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} /> : "0"}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <ProblemSection />
        <FeaturesSection />
        <AICopilotSection copilotStep={copilotStep} />
        <AIAgentSection />
        <PricingSection />
        <TestimonialsSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
