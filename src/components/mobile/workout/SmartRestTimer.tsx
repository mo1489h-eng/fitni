import { useEffect, useMemo, useState } from "react";
import { useWorkoutSession } from "./WorkoutSessionContext";
import { playRestCompleteBeep } from "@/lib/workoutFeedback";
import { hapticImpact } from "./haptics";

/**
 * Floating rest timer — timestamp-aware via parent `restEndsAtMs` + `restRemaining`,
 * pause/resume, haptics in last 5s, subtle audio pulse.
 */
export default function SmartRestTimer() {
  const {
    restRemaining,
    restTotalSeconds,
    restPaused,
    skipRest,
    addRestSeconds,
    pauseRest,
    resumeRest,
  } = useWorkoutSession();

  const [pulse, setPulse] = useState(false);

  const progress = useMemo(() => {
    if (!restTotalSeconds) return 0;
    return 1 - restRemaining / restTotalSeconds;
  }, [restRemaining, restTotalSeconds]);

  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  useEffect(() => {
    if (restRemaining !== 0) return;
    void playRestCompleteBeep();
    void hapticImpact("medium");
  }, [restRemaining]);

  /** Last 5s: escalating haptics + soft pulse */
  useEffect(() => {
    if (restRemaining <= 0 || restRemaining > 5 || restPaused) return;
    void hapticImpact("light");
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 120);
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 440 + (6 - restRemaining) * 40;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.03, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.06);
        ctx.resume?.();
      }
    } catch {
      /* ignore */
    }
    return () => window.clearTimeout(t);
  }, [restRemaining, restPaused]);

  const mm = String(Math.floor(restRemaining / 60)).padStart(2, "0");
  const ss = String(restRemaining % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[130] flex flex-col items-stretch bg-gradient-to-b from-transparent to-background px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
      dir="rtl"
    >
      <div
        className="mx-auto mb-3 w-full max-w-md rounded-2xl border border-border bg-background px-4 py-4 shadow-2xl transition-transform"
        style={{ transform: pulse ? "scale(1.01)" : "scale(1)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-2xl font-black tabular-nums text-foreground">
            {mm}:{ss}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {restPaused ? "متوقف" : "راحة"}
          </p>
        </div>

        <div className="relative mx-auto mb-4 flex h-36 w-36 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          </svg>
          <div className="relative z-[1] text-center">
            <p className="text-4xl font-black tabular-nums text-foreground">{restRemaining}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              ثانية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => (restPaused ? resumeRest() : pauseRest())}
            className="rounded-xl bg-card py-3 text-sm font-bold text-foreground transition active:scale-95"
          >
            {restPaused ? "استئناف" : "إيقاف"}
          </button>
          <button
            type="button"
            onClick={() => addRestSeconds(30)}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            +30 ث
          </button>
          <button
            type="button"
            onClick={() => skipRest()}
            className="rounded-xl border border-primary/50 py-3 text-sm font-bold text-primary transition active:scale-95"
          >
            تخطي
          </button>
        </div>
      </div>
    </div>
  );
}
