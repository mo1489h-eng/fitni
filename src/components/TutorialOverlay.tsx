import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTutorial } from "@/hooks/useTutorial";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Rocket, X } from "lucide-react";

const TutorialOverlay = () => {
  const { isActive, currentStep, totalSteps, step, next, prev, skip, startTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const checkedRef = useRef(false);

  const findSpotlight = useCallback(() => {
    if (!step?.spotlightSelector) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.spotlightSelector);
    if (!el) {
      setSpotlightRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const initialRect = el.getBoundingClientRect();
    setSpotlightRect(initialRect);

    window.setTimeout(() => {
      const updatedRect = el.getBoundingClientRect();
      setSpotlightRect(updatedRect);
    }, 350);
  }, [step]);

  useEffect(() => {
    if (!user || !profile || checkedRef.current) return;
    checkedRef.current = true;

    if (
      !(profile as any).onboarding_completed &&
      (location.pathname === "/trainer-dashboard" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/coach/dashboard")
    ) {
      const timer = window.setTimeout(() => startTutorial(), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [user, profile, location.pathname, startTutorial]);

  useEffect(() => {
    if (!isActive || !step) return;

    if (step.route && location.pathname !== step.route) {
      setIsNavigating(true);
      setSpotlightRect(null);
      navigate(step.route);
      return;
    }

    const timer = window.setTimeout(() => {
      findSpotlight();
      setIsNavigating(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [currentStep, isActive, step, location.pathname, navigate, findSpotlight]);

  useEffect(() => {
    if (!isActive || !step || !isNavigating || location.pathname !== step.route) return;

    const timer = window.setTimeout(() => {
      findSpotlight();
      setIsNavigating(false);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [location.pathname, isActive, step, isNavigating, findSpotlight]);

  useEffect(() => {
    if (!isActive) return;

    const recalculate = () => findSpotlight();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        skip();
      }
    };

    window.addEventListener("resize", recalculate);
    window.addEventListener("scroll", recalculate, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", recalculate);
      window.removeEventListener("scroll", recalculate, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, findSpotlight, skip]);

  if (!isActive || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const pad = 10;

  const clipPath = spotlightRect
    ? `polygon(
        0% 0%, 0% 100%,
        ${spotlightRect.left - pad}px 100%,
        ${spotlightRect.left - pad}px ${spotlightRect.top - pad}px,
        ${spotlightRect.right + pad}px ${spotlightRect.top - pad}px,
        ${spotlightRect.right + pad}px ${spotlightRect.bottom + pad}px,
        ${spotlightRect.left - pad}px ${spotlightRect.bottom + pad}px,
        ${spotlightRect.left - pad}px 100%,
        100% 100%, 100% 0%
      )`
    : undefined;

  const tooltipStyle: React.CSSProperties = spotlightRect
    ? {
        position: "fixed",
        top:
          spotlightRect.bottom + 20 > window.innerHeight - 280
            ? Math.max(16, spotlightRect.top - 260)
            : spotlightRect.bottom + 20,
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
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{ backgroundColor: "hsl(var(--foreground) / 0.78)", clipPath }}
        onClick={skip}
      />

      {spotlightRect && (
        <div
          className="absolute rounded-lg pointer-events-none transition-all duration-500"
          style={{
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            border: "2px solid #4f6f52",
            boxShadow: "none",
            zIndex: 205,
          }}
        />
      )}

      <div
        className="w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-border bg-background shadow-2xl"
        style={tooltipStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5">
          <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              الخطوة {currentStep + 1} من {totalSteps}
            </p>
            <button
              type="button"
              onClick={skip}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="w-3 h-3" />
              تخطي
            </button>
          </div>

          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <StepIcon className="w-5 h-5 text-primary" />
          </div>

          <h2 className="mb-1.5 text-center text-base font-bold text-foreground">{step.title}</h2>
          <p className="mb-5 text-center text-sm leading-relaxed text-muted-foreground">{step.description}</p>

          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="icon" className="shrink-0" onClick={prev}>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {isFirst ? (
              <>
                <Button variant="outline" className="flex-1 text-sm" onClick={skip}>
                  تخطي
                </Button>
                <Button className="flex-[2] gap-1.5 text-sm" onClick={next}>
                  ابدأ الجولة
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </>
            ) : isLast ? (
              <Button className="flex-1 gap-1.5 text-sm" onClick={next}>
                <Rocket className="w-4 h-4" />
                ابدأ الآن
              </Button>
            ) : (
              <Button className="flex-1 gap-1.5 text-sm" onClick={next}>
                التالي
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
