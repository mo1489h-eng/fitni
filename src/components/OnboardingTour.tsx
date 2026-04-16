import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dumbbell, X, ArrowLeft, ArrowRight, Users, ClipboardList,
  CreditCard, Rocket, UtensilsCrossed, CalendarDays,
} from "lucide-react";
import { COACH_PREFIX, TRAINER_HOME } from "@/lib/app-routes";

const C = COACH_PREFIX;

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  spotlightSelector?: string;
}

const steps: Step[] = [
  {
    title: "أهلاً بك في CoachBase",
    description: "جولة سريعة تريك كل شيء",
    icon: Dumbbell,
    route: TRAINER_HOME,
  },
  {
    title: "لوحة التحكم",
    description: "إحصائياتك اليومية دايماً هنا — عملاء، إيرادات، ونشاط",
    icon: Dumbbell,
    route: TRAINER_HOME,
    spotlightSelector: ".grid.grid-cols-2",
  },
  {
    title: "إدارة العملاء",
    description: "من هنا تضيف وتدير كل عملاءك",
    icon: Users,
    route: `${C}/clients`,
    spotlightSelector: "[data-tour='add-client']",
  },
  {
    title: "البرامج التدريبية",
    description: "قوالب جاهزة أو ابنِ برنامجك من الصفر",
    icon: ClipboardList,
    route: `${C}/programs`,
    spotlightSelector: "[data-tour='program-templates']",
  },
  {
    title: "التغذية",
    description: "صمّم جداول غذائية احترافية لعملاءك",
    icon: UtensilsCrossed,
    route: `${C}/nutrition`,
    spotlightSelector: "[data-tour='create-plan']",
  },
  {
    title: "التقويم",
    description: "نظّم جلساتك وتقويمك هنا",
    icon: CalendarDays,
    route: `${C}/calendar`,
    spotlightSelector: "[data-tour='add-session']",
  },
  {
    title: "المدفوعات والإيرادات",
    description: "تابع مدفوعات عملاءك وإيراداتك",
    icon: CreditCard,
    route: `${C}/payments`,
  },
  {
    title: "أنت جاهز للبدء",
    description: "ابدأ بإضافة أول عميل الحين",
    icon: Rocket,
    route: TRAINER_HOME,
  },
];

interface OnboardingTourProps {
  forceShow?: boolean;
  onForceClose?: () => void;
}

const OnboardingTour = ({ forceShow, onForceClose }: OnboardingTourProps) => {
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const checkedRef = useRef(false);

  // Check onboarding status from Supabase
  useEffect(() => {
    if (forceShow) {
      setActive(true);
      setCurrent(0);
      return;
    }
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        data &&
        !(data as any).onboarding_completed &&
        (location.pathname === TRAINER_HOME || location.pathname === "/dashboard" || location.pathname === "/trainer-dashboard")
      ) {
        setTimeout(() => setActive(true), 800);
      }
    };
    check();
  }, [user, location.pathname, forceShow]);

  // Mark onboarding complete in Supabase
  const markComplete = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    }
  }, [user]);

  const close = useCallback(() => {
    setActive(false);
    setSpotlightRect(null);
    markComplete();
    onForceClose?.();
  }, [markComplete, onForceClose]);

  // Navigate and spotlight on step change
  useEffect(() => {
    if (!active) return;
    const step = steps[current];
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
    // Delay spotlight to allow page render
    const timer = setTimeout(() => {
      if (step.spotlightSelector) {
        const el = document.querySelector(step.spotlightSelector);
        if (el) {
          setSpotlightRect(el.getBoundingClientRect());
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setSpotlightRect(null);
        }
      } else {
        setSpotlightRect(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [current, active, location.pathname, navigate]);

  // Recalculate spotlight on resize
  useEffect(() => {
    if (!active) return;
    const handleResize = () => {
      const step = steps[current];
      if (step.spotlightSelector) {
        const el = document.querySelector(step.spotlightSelector);
        if (el) setSpotlightRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, current]);

  const next = useCallback(() => {
    if (current >= steps.length - 1) {
      close();
      navigate("/clients");
      return;
    }
    setCurrent((c) => c + 1);
  }, [current, close, navigate]);

  const prev = useCallback(() => {
    if (current <= 0) return;
    setCurrent((c) => c - 1);
  }, [current]);

  if (!active) return null;

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const StepIcon = step.icon;

  // Spotlight clip path
  const clipPath = spotlightRect
    ? `polygon(
        0% 0%, 0% 100%, 
        ${spotlightRect.left - 8}px 100%, 
        ${spotlightRect.left - 8}px ${spotlightRect.top - 8}px, 
        ${spotlightRect.right + 8}px ${spotlightRect.top - 8}px, 
        ${spotlightRect.right + 8}px ${spotlightRect.bottom + 8}px, 
        ${spotlightRect.left - 8}px ${spotlightRect.bottom + 8}px, 
        ${spotlightRect.left - 8}px 100%, 
        100% 100%, 100% 0%
      )`
    : undefined;

  // Tooltip position
  const tooltipStyle: React.CSSProperties = spotlightRect
    ? {
        position: "fixed",
        top: spotlightRect.bottom + 16 > window.innerHeight - 250
          ? Math.max(16, spotlightRect.top - 220)
          : spotlightRect.bottom + 16,
        left: Math.min(Math.max(16, spotlightRect.left), window.innerWidth - 340),
        zIndex: 210,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 210,
      };

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: "auto" }}>
      {/* Dark overlay with spotlight cutout */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundColor: "rgba(0,0,0,0.75)",
          clipPath,
        }}
        onClick={close}
      />

      {/* Spotlight glow border */}
      {spotlightRect && (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-500"
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
            border: "2px solid hsl(var(--primary))",
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)",
            zIndex: 205,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-border shadow-2xl animate-scale-in"
        style={{
          ...tooltipStyle,
          backgroundColor: "#1a1a1a",
        }}
      >
        <div className="p-5">
          {/* Skip button */}
          <button
            onClick={close}
            className="absolute top-3 left-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step indicator */}
          <p className="text-xs text-muted-foreground text-center mb-3">
            الخطوة {current + 1} من {steps.length}
          </p>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <StepIcon className="w-6 h-6 text-primary" />
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-foreground text-center mb-1.5">{step.title}</h2>
          <p className="text-muted-foreground text-center text-sm leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-primary w-4"
                    : i < current
                    ? "bg-primary/50 w-1.5"
                    : "bg-muted w-1.5"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isFirst ? (
              <>
                <Button variant="outline" className="flex-1 text-sm" onClick={close}>
                  تخطي
                </Button>
                <Button className="flex-[2] gap-1.5 text-sm" onClick={next}>
                  ابدأ الجولة
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </>
            ) : isLast ? (
              <>
                <Button variant="outline" className="flex-1 text-sm" onClick={close}>
                  استكشف بنفسي
                </Button>
                <Button
                  className="flex-[2] gap-1.5 text-sm"
                  onClick={() => {
                    close();
                    navigate("/clients");
                  }}
                >
                  + إضافة عميل
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={prev}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button className="flex-1 gap-1.5 text-sm" onClick={next}>
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
