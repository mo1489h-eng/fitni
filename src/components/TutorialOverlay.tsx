import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTutorial } from "@/hooks/useTutorial";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

const TutorialOverlay = () => {
  const { isActive, currentStep, totalSteps, step, next, prev, skip, startTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const checkedRef = useRef(false);

  // Auto-start tutorial for new users
  useEffect(() => {
    if (!user || !profile || checkedRef.current) return;
    checkedRef.current = true;

    if (!(profile as any).onboarding_completed && location.pathname === "/dashboard") {
      setTimeout(() => startTutorial(), 1000);
    }
  }, [user, profile, location.pathname, startTutorial]);

  // Navigate when step changes
  useEffect(() => {
    if (!isActive || !step) return;

    if (step.route && location.pathname !== step.route) {
      setIsNavigating(true);
      setSpotlightRect(null);
      navigate(step.route);
    } else {
      // Same page — find spotlight after short delay
      const timer = setTimeout(() => {
        findSpotlight();
        setIsNavigating(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isActive]);

  // After navigation, wait 800ms for page to render then spotlight
  useEffect(() => {
    if (!isActive || !step || !isNavigating) return;
    if (location.pathname === step.route) {
      const timer = setTimeout(() => {
        findSpotlight();
        setIsNavigating(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isActive, step, isNavigating]);

  const findSpotlight = useCallback(() => {
    if (!step?.spotlightSelector) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(step.spotlightSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Recalc after scroll
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setSpotlightRect(r);
      }, 350);
    } else {
      setSpotlightRect(null);
    }
  }, [step]);

  // Recalculate on resize
  useEffect(() => {
    if (!isActive) return;
    const handle = () => findSpotlight();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [isActive, findSpotlight]);

  if (!isActive || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Spotlight clip path
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

  // Tooltip position
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
      {/* Overlay */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{ backgroundColor: "rgba(0,0,0,0.78)", clipPath }}
        onClick={skip}
      />

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg pointer-events-none transition-all duration-500"
          style={{
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            border: "2px solid hsl(142 76% 36%)",
            boxShadow: "0 0 24px hsl(142 76% 36% / 0.35)",
            zIndex: 205,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-border"
        style={{ ...tooltipStyle, backgroundColor: "#111111" }}
      >
        <div className="p-5">
          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step counter + skip */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              الخطوة {currentStep + 1} من {totalSteps}
            </p>
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              تخطي
            </button>
          </div>

          {/* Icon */}
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <StepIcon className="w-5 h-5 text-primary" />
          </div>

          {/* Content */}
          <h2 className="text-base font-bold text-foreground text-center mb-1.5">
            {step.title}
          </h2>
          <p className="text-muted-foreground text-center text-sm leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Actions */}
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
                🚀 ابدأ الآن
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