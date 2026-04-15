import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, ChevronLeft, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isOnboardingComplete, markOnboardingComplete } from "@/lib/onboarding";

const BG = "#050505";
const PRIMARY = "#22C55E";

export type OnboardingSlideData = {
  title: string;
  description: string;
  icon: typeof Brain;
};

const SLIDES: OnboardingSlideData[] = [
  {
    title: "درّب بذكاء",
    description: "تابع التمارين والعملاء والتقدم في نظام واحد متكامل",
    icon: Brain,
  },
  {
    title: "إدارة العملاء بسهولة",
    description: "أنشئ برامج، تابع الأداء، وطوّر عملك كمدرب",
    icon: Users,
  },
  {
    title: "التزم وحقق أهدافك",
    description: "اتبع خطتك وراقب نتائجك خطوة بخطوة",
    icon: Target,
  },
  {
    title: "ابدأ رحلتك",
    description: "",
    icon: Sparkles,
  },
];

const SWIPE_THRESHOLD_PX = 48;
const TRANSITION_MS = 0.3;

export type OnboardingProps = {
  /** Called after marking onboarding complete (e.g. parent state). */
  onComplete?: () => void;
};

function OnboardingSlideContent({
  slide,
  reducedMotion,
}: {
  slide: OnboardingSlideData;
  reducedMotion: boolean;
}) {
  const Icon = slide.icon;
  return (
    <div className="flex flex-col items-center text-center px-6">
      <motion.div
        className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{
          background: `${PRIMARY}18`,
          boxShadow: `0 0 40px ${PRIMARY}22`,
        }}
        initial={reducedMotion ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon className="h-10 w-10" style={{ color: PRIMARY }} strokeWidth={1.35} />
      </motion.div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{slide.title}</h1>
      {slide.description ? (
        <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">{slide.description}</p>
      ) : null}
    </div>
  );
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isOnboardingComplete()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const lastIndex = SLIDES.length - 1;
  const isLast = index >= lastIndex;

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, lastIndex));
  }, [lastIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skipToLast = useCallback(() => {
    setIndex(lastIndex);
  }, [lastIndex]);

  const finishAndNavigate = useCallback(
    (path: "/login" | "/register") => {
      markOnboardingComplete();
      onComplete?.();
      navigate(path, { replace: true });
    },
    [navigate, onComplete],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    // RTL: swipe right (positive delta) → visually "next" in reading order
    if (delta > 0) goNext();
    else goPrev();
  };

  const slideVariants = reducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.97 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.97 },
      };

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{
        backgroundColor: BG,
        color: "#fff",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      dir="rtl"
    >
      {/* Skip — top */}
      <div className="flex shrink-0 justify-start px-4 pt-3">
        {!isLast ? (
          <button
            type="button"
            onClick={skipToLast}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
            aria-label="تخطي إلى آخر شاشة"
          >
            تخطي
          </button>
        ) : (
          <span className="h-10 w-16" aria-hidden />
        )}
      </div>

      {/* Slides */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-2 pb-6 pt-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative w-full max-w-md flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              {...slideVariants}
              transition={{ duration: TRANSITION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <OnboardingSlideContent slide={SLIDES[index]!} reducedMotion={reducedMotion} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="خطوات التعريف">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`الشريحة ${i + 1} من ${SLIDES.length}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-8" : "w-2 bg-white/25 hover:bg-white/40",
              )}
              style={i === index ? { backgroundColor: PRIMARY } : undefined}
            />
          ))}
        </div>

        {/* Next or auth */}
        <div className="mt-8 w-full max-w-sm px-4">
          {!isLast ? (
            <Button
              type="button"
              onClick={goNext}
              className="h-12 w-full rounded-xl text-base font-semibold text-[#050505] shadow-lg transition-transform active:scale-[0.98]"
              style={{ backgroundColor: PRIMARY, boxShadow: `0 12px 40px ${PRIMARY}35` }}
            >
              <span>التالي</span>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => finishAndNavigate("/login")}
                className="h-12 w-full rounded-xl text-base font-semibold text-[#050505] shadow-lg"
                style={{ backgroundColor: PRIMARY, boxShadow: `0 12px 40px ${PRIMARY}35` }}
              >
                تسجيل الدخول
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => finishAndNavigate("/register")}
                className="h-12 w-full rounded-xl border-white/20 bg-transparent text-base font-semibold text-white hover:bg-white/5"
              >
                إنشاء حساب
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
