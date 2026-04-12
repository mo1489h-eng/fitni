import { useEffect, useMemo, useState } from "react";
import { useWorkoutSession } from "./WorkoutSessionContext";
import { CB } from "./designTokens";
import { playRestCompleteBeep } from "@/lib/workoutFeedback";
import { hapticImpact } from "./haptics";

const MESSAGES = [
  "استعد للمجموعة القادمة 💪",
  "تنفس بعمق",
  "أنت تتقدم كل يوم",
  "الألم مؤقت، النتائج دائمة",
];

export default function RestTimerScreen() {
  const { restRemaining, restTotalSeconds, skipRest, addRestSeconds } = useWorkoutSession();
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 10000);
    return () => window.clearInterval(id);
  }, []);

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

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(10,10,10,0.94)" }}
      dir="rtl"
    >
      <div className="relative mb-8 flex h-44 w-44 items-center justify-center">
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={CB.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="relative z-[1] text-center">
          <p className="text-5xl font-black tabular-nums text-white">{restRemaining}</p>
          <p className="mt-1 text-xs" style={{ color: CB.muted }}>
            ثانية
          </p>
        </div>
      </div>
      <p className="mb-2 text-base font-semibold text-white">وقت الراحة</p>
      <p className="mb-10 min-h-[48px] max-w-xs text-center text-sm" style={{ color: CB.muted }}>
        {MESSAGES[msgIdx]}
      </p>
      <div className="flex w-full max-w-xs gap-3">
        <button
          type="button"
          onClick={() => skipRest()}
          className="flex-1 rounded-[12px] border py-3 text-sm font-bold transition active:scale-95"
          style={{ borderColor: "rgba(34,197,94,0.5)", color: CB.accent }}
        >
          تخطي
        </button>
        <button
          type="button"
          onClick={() => addRestSeconds(30)}
          className="flex-1 rounded-[12px] py-3 text-sm font-bold text-black transition active:scale-95"
          style={{ background: CB.gradient }}
        >
          +30 ثانية
        </button>
      </div>
    </div>
  );
}
