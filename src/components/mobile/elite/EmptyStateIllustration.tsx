import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { eliteSpring } from "./spring";

type Props = {
  className?: string;
};

/** Minimal dumbbell + plate — subtle float via motion (no extra CSS) */
export function EmptyStateIllustration({ className }: Props) {
  return (
    <motion.div
      className={cn("mx-auto w-[120px]", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={eliteSpring}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
      <svg
        viewBox="0 0 120 80"
        className="h-auto w-full text-white/[0.12]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="12" y="34" width="14" height="28" rx="4" fill="currentColor" opacity="0.35" />
        <rect x="94" y="34" width="14" height="28" rx="4" fill="currentColor" opacity="0.35" />
        <rect x="26" y="38" width="68" height="20" rx="10" fill="currentColor" opacity="0.55" />
        <circle cx="19" cy="48" r="5" fill="#22C55E" opacity="0.45" />
        <circle cx="101" cy="48" r="5" fill="#22C55E" opacity="0.45" />
        <path
          d="M40 48h40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.25"
        />
      </svg>
      </motion.div>
    </motion.div>
  );
}
