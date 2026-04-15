import { Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = "#22C55E";

type Props = {
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
};

/**
 * CoachBase AI — platform-native assistant identity (no third-party AI branding).
 */
export function CoachBaseAIMark({ size = "md", className, showLabel = true }: Props) {
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className={cn("flex items-center gap-2", className)} dir="rtl">
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `${ACCENT}18`,
          boxShadow: `0 0 20px ${ACCENT}33`,
        }}
        aria-hidden
      >
        <Brain className={cn(icon, "absolute text-white/90")} strokeWidth={1.5} />
        <Zap
          className={cn(icon, "relative text-[#22C55E]")}
          style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.8))" }}
          strokeWidth={2.2}
        />
      </span>
      {showLabel && (
        <div className="min-w-0 flex flex-col leading-tight">
          <span className="text-sm font-bold text-white">CoachBase AI</span>
          <span className="text-[10px] font-medium text-white/45">مدعوم بالذكاء</span>
        </div>
      )}
    </div>
  );
}
