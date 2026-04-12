import { Sparkles } from "lucide-react";
import { useCopilot } from "./useCopilot";
import { CB } from "../workout/designTokens";

export default function CopilotButton() {
  const { setOpen, pendingSuggestion } = useCopilot();

  return (
    <button
      type="button"
      aria-label="فتح كوتش"
      onClick={() => setOpen(true)}
      className={`fixed z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
        pendingSuggestion ? "animate-pulse" : ""
      }`}
      style={{
        bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        right: "1rem",
        background: CB.gradient,
        boxShadow: `0 0 24px rgba(34, 197, 94, 0.45), ${CB.shadow}`,
      }}
    >
      <Sparkles className="h-7 w-7 text-black" strokeWidth={2} aria-hidden />
    </button>
  );
}
