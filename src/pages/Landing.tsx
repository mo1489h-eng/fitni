import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePrefersReducedMotion } from "@/components/landing/LandingUtils";
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
import { Clock, Users, Shield } from "lucide-react";

const valueProps = [
  {
    icon: Clock,
    title: "مجاناً 6 شهور",
    subtitle: "بدون بطاقة ائتمان\nبدون أي التزام",
  },
  {
    icon: Users,
    title: "لأول 500 مدرب فقط",
    subtitle: "أماكن محدودة\nسجّل الحين",
  },
  {
    icon: Shield,
    title: "آمن وموثوق",
    subtitle: "بياناتك محمية\nومشفرة بالكامل",
  },
];

const Landing = () => {
  const { user, loading } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [copilotStep, setCopilotStep] = useState(0);

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

        <section className="border-y border-border bg-card/60 px-4 py-8 backdrop-blur md:px-6 md:py-12">
          <div className="mx-auto max-w-4xl grid gap-4 md:grid-cols-3">
            {valueProps.map((prop) => (
              <div
                key={prop.title}
                className="rounded-xl border border-[hsl(0_0%_13%)] bg-[hsl(0_0%_7%)] p-6"
              >
                <prop.icon className="h-7 w-7 text-primary mb-4" strokeWidth={1.5} />
                <div className="text-lg font-bold text-foreground">{prop.title}</div>
                <div className="mt-2 text-sm text-foreground/45 whitespace-pre-line leading-relaxed">
                  {prop.subtitle}
                </div>
              </div>
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
