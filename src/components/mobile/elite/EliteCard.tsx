import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ELITE } from "../workout/designTokens";

const GLOW: Record<"emerald" | "blue" | "amber" | "violet" | "none", string> = {
  emerald: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(34,197,94,0.22), transparent 65%)",
  blue: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(59,130,246,0.22), transparent 65%)",
  amber: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(245,158,11,0.2), transparent 65%)",
  violet: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(139,92,246,0.22), transparent 65%)",
  none: "none",
};

type Props = {
  children: ReactNode;
  className?: string;
  /** Subtle top glow — metric cards on dashboard */
  glow?: keyof typeof GLOW;
};

export function EliteCard({ children, className, glow = "none" }: Props) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[20px] border border-white/[0.05] bg-[#0A0A0A]", className)}
      style={{ boxShadow: ELITE.innerShadow }}
    >
      {glow !== "none" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{ background: GLOW[glow] }}
          aria-hidden
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
