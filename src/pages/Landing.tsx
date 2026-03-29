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
import { supabase } from "@/integrations/supabase/client";
import { Clock, Star, Shield, Users } from "lucide-react";

const Landing = () => {
  const { user, loading } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [copilotStep, setCopilotStep] = useState(0);
  const [trainerCount, setTrainerCount] = useState<number>(0);
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

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setTrainerCount(count ?? 0);
    };
    fetchCount();
  }, []);

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

        <section ref={statsInView.ref} className="border-y border-border bg-card/60 px-4 py-8 backdrop-blur md:px-6 md:py-12">
          <div className="mx-auto max-w-4xl text-center mb-8">
            <h2 className="text-2xl font-black text-foreground md:text-3xl">
              كن من أوائل <span className="text-primary">100</span> مدرب على CoachBase
            </h2>
            <p className="mt-2 text-foreground/50 text-sm">انضم للمدربين الأوائل في السعودية</p>
          </div>

          <div className="mx-auto max-w-4xl grid gap-4 md:grid-cols-3">
            <Card className="border-primary/20 bg-background/70 backdrop-blur relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-primary/40" />
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">مجاناً 6 شهور</div>
                  <div className="text-sm text-foreground/50 mt-1 leading-relaxed">لجميع المدربين<br/>بدون أي التزام</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-background/70 backdrop-blur relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-primary/40" />
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">سعر المؤسسين</div>
                  <div className="text-sm text-foreground/50 mt-1 leading-relaxed">أول 500 مدرب فقط<br/>يحصلون على سعر خاص للأبد</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-background/70 backdrop-blur relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-primary/40" />
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-black text-foreground">آمن وموثوق</div>
                  <div className="text-sm text-foreground/50 mt-1 leading-relaxed">بياناتك محمية<br/>ومشفرة بالكامل</div>
                </div>
              </CardContent>
            </Card>
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
