import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Home } from "lucide-react";
import { motion } from "framer-motion";
import { setKey, useWorkoutSession } from "../WorkoutSessionContext";
import { totalSetsInPlan } from "@/lib/workoutDayPlan";
import { hapticSuccess } from "../haptics";

const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#252525";
const GREEN = "#16a34a";
const GOLD = "#f59e0b";

function formatHms(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function WorkoutCompleteCelebration() {
  const {
    plan,
    completed,
    elapsedMs,
    totalVolume,
    sessionId,
    finalizeAndExit,
    finalizeWorkout,
  } = useWorkoutSession();

  const [persisted, setPersisted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!sessionId || persisted) return;
    void (async () => {
      try {
        await finalizeWorkout();
        setPersisted(true);
      } catch (e) {
        setSaveError((e as Error).message);
      }
    })();
  }, [sessionId, persisted, finalizeWorkout]);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void hapticSuccess();
    const duration = 1800;
    const end = Date.now() + duration;
    const colors = [GREEN, GOLD, "#22c55e", "#fde047", "#ffffff"];
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.3 },
        colors,
        startVelocity: 45,
        scalar: 0.9,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.3 },
        colors,
        startVelocity: 45,
        scalar: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    return () => confetti.reset();
  }, []);

  const totalSetsPlanned = totalSetsInPlan(plan);
  const setsCompleted = useMemo(() => Object.keys(completed).length, [completed]);

  const prCount = useMemo(() => {
    const set = new Set<string>();
    for (const ex of plan) {
      for (let n = 1; n <= ex.sets; n++) {
        const done = completed[setKey(ex.exerciseId, n)];
        if (done?.isPr) {
          set.add(ex.exerciseId);
          break;
        }
      }
    }
    return set.size;
  }, [plan, completed]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto" style={{ background: BG }} dir="rtl">
      <div className="flex w-full max-w-md flex-col items-center px-6 pb-10 pt-[max(48px,env(safe-area-inset-top))]">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-center"
          style={{ fontSize: 64, lineHeight: 1 }}
        >
          🎉
        </motion.div>

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="text-center text-[26px] font-black text-white"
        >
          أحسنت! انتهى تمرينك
        </motion.h1>

        {saveError ? (
          <p className="mt-4 rounded-[12px] p-3 text-center text-[12px] text-red-400" style={{ background: CARD }}>
            {saveError}
          </p>
        ) : null}

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="mt-8 w-full rounded-[18px] p-5"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <StatRow icon="⏱" label="المدة" value={formatHms(elapsedMs)} />
          <Divider />
          <StatRow icon="🏋" label="الحجم الكلي" value={`${Math.round(totalVolume).toLocaleString("en-US")} كغ`} />
          <Divider />
          <StatRow icon="✅" label="السيتات" value={`${setsCompleted} / ${totalSetsPlanned}`} />
          <Divider />
          <StatRow
            icon="🏆"
            label="أرقام شخصية"
            value={prCount > 0 ? `${prCount} تمرين` : "—"}
            highlight={prCount > 0}
          />
        </motion.div>

        <motion.button
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.34, duration: 0.35 }}
          type="button"
          onClick={() => void finalizeAndExit()}
          className="mt-8 flex h-[56px] w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-bold text-white transition active:scale-[0.99]"
          style={{ background: GREEN }}
        >
          <Home className="h-5 w-5" strokeWidth={2.25} />
          العودة للرئيسية
        </motion.button>

        <p className="mt-4 text-center text-[11px] text-white/35">
          {persisted ? "✓ تم حفظ التمرين" : "جاري حفظ التمرين…"}
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-3 h-px" style={{ background: BORDER }} />;
}

function StatRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-[14px] text-white/65">{label}</span>
      </div>
      <span
        className="text-[17px] font-black tabular-nums"
        style={{ color: highlight ? GOLD : "#ffffff" }}
      >
        {value}
      </span>
    </div>
  );
}
