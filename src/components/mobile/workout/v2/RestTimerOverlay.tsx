import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, SkipForward } from "lucide-react";
import { hapticImpact } from "../haptics";
import { useWorkoutSession } from "../WorkoutSessionContext";

const RING_SIZE = 220;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

const GREEN = "#16a34a";
const YELLOW = "#eab308";
const RED = "#ef4444";
const TRACK = "#1f1f1f";

function colorForRatio(ratio: number): string {
  // Discrete thresholds per spec: >60% green, 30–60% yellow, <30% red.
  if (ratio > 0.6) return GREEN;
  if (ratio > 0.3) return YELLOW;
  return RED;
}

function formatTime(total: number): string {
  const s = Math.max(0, Math.ceil(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function RestTimerOverlay() {
  const { phase, restTotalSeconds, restEndsAtMs, restPaused, skipRest, addRestSeconds, restKind } = useWorkoutSession();

  const isOpen = phase === "rest";
  const [now, setNow] = useState(() => Date.now());
  const flashFiredRef = useRef(false);
  const [flashing, setFlashing] = useState(false);

  // 60 fps smooth animation via requestAnimationFrame.
  useEffect(() => {
    if (!isOpen || restPaused) return;
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, restPaused]);

  useEffect(() => {
    if (!isOpen) {
      flashFiredRef.current = false;
      setFlashing(false);
    }
  }, [isOpen]);

  const remainingMs = restEndsAtMs != null ? Math.max(0, restEndsAtMs - now) : 0;
  const remainingSec = remainingMs / 1000;
  const ratio = restTotalSeconds > 0 ? Math.max(0, Math.min(1, remainingMs / (restTotalSeconds * 1000))) : 0;

  useEffect(() => {
    if (!isOpen) return;
    if (remainingMs <= 0 && !flashFiredRef.current) {
      flashFiredRef.current = true;
      setFlashing(true);
      void hapticImpact("heavy");
      const t = window.setTimeout(() => setFlashing(false), 900);
      return () => window.clearTimeout(t);
    }
  }, [isOpen, remainingMs]);

  const color = flashing ? GREEN : colorForRatio(ratio);
  const strokeDashoffset = RING_CIRC * (1 - ratio);

  const title = restKind === "between_exercises" ? "استراحة بين التمارين" : "استراحة بين السيتات";

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="rest-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
          style={{
            background: "rgba(5, 5, 5, 0.82)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
          dir="rtl"
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.25 }}
            className="mb-8 text-[17px] font-bold tracking-wide text-white/80"
          >
            {title}
          </motion.p>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: flashing ? [1, 1.06, 1] : 1,
              opacity: 1,
            }}
            transition={{ duration: flashing ? 0.5 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={TRACK}
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={color}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: "stroke 300ms ease",
                  filter: `drop-shadow(0 0 14px ${color}66)`,
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-black leading-none text-white"
                style={{ fontSize: 48, fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(remainingSec)}
              </span>
              <span className="mt-2.5 text-[14px] font-medium text-white/55">ثانية متبقية</span>
            </div>
          </motion.div>

          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void hapticImpact("light");
                addRestSeconds(30);
              }}
              className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-bold text-white transition active:scale-[0.97]"
              style={{ background: "#1a1a1a", border: "1px solid #252525", minWidth: 128 }}
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              30 ثانية
            </button>

            <button
              type="button"
              onClick={() => {
                void hapticImpact("medium");
                skipRest();
              }}
              className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-bold text-white transition active:scale-[0.97]"
              style={{ background: GREEN, minWidth: 128 }}
            >
              <SkipForward className="h-4 w-4" strokeWidth={2.25} />
              تخطي الاستراحة
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
