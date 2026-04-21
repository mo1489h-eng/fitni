import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { hapticImpact } from "../haptics";

type Props = {
  value: string;
  onChange: (next: string) => void;
  step: number;
  allowDecimals?: boolean;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

const HOLD_DELAY = 380;
const HOLD_REPEAT = 90;

function formatValue(n: number, allowDecimals: boolean): string {
  if (!isFinite(n)) return "";
  if (allowDecimals) {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }
  return String(Math.max(0, Math.round(n)));
}

export default function StepperInput({
  value,
  onChange,
  step,
  allowDecimals = false,
  disabled = false,
  placeholder = "—",
  ariaLabel,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [displayPlaceholder, setDisplayPlaceholder] = useState(!value);
  const holdTimerRef = useRef<number | null>(null);
  const holdRepeatRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayPlaceholder(!value && !focused);
  }, [value, focused]);

  const commit = useCallback(
    (delta: number) => {
      const current = parseFloat(value || "0") || 0;
      const next = Math.max(0, current + delta);
      onChange(formatValue(next, allowDecimals));
    },
    [value, onChange, allowDecimals]
  );

  const clearHold = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdRepeatRef.current != null) {
      window.clearInterval(holdRepeatRef.current);
      holdRepeatRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (delta: number) => {
      clearHold();
      void hapticImpact("light");
      commit(delta);
      holdTimerRef.current = window.setTimeout(() => {
        holdRepeatRef.current = window.setInterval(() => commit(delta), HOLD_REPEAT);
      }, HOLD_DELAY);
    },
    [commit, clearHold]
  );

  useEffect(() => () => clearHold(), [clearHold]);

  return (
    <div
      className="flex h-[56px] items-center overflow-hidden rounded-[12px] transition"
      style={{
        background: focused ? "#1c1c1c" : "#141414",
        border: `1px solid ${focused ? "#3f3f3f" : "#252525"}`,
        opacity: disabled ? 0.5 : 1,
      }}
      dir="ltr"
    >
      <button
        type="button"
        aria-label="decrement"
        disabled={disabled}
        className="flex h-full w-10 items-center justify-center text-white/60 transition active:scale-90 active:text-white"
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(-step);
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
      >
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <input
        type="text"
        inputMode="decimal"
        pattern={allowDecimals ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, "");
          if (!allowDecimals) {
            onChange(raw.replace(/\./g, ""));
          } else {
            const parts = raw.split(".");
            onChange(parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : raw);
          }
        }}
        onFocus={() => {
          setFocused(true);
          void hapticImpact("light");
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className="h-full w-full flex-1 bg-transparent text-center text-[22px] font-bold tabular-nums text-white outline-none placeholder:font-semibold placeholder:text-white/25"
        style={{ WebkitAppearance: "none", color: displayPlaceholder ? "rgba(255,255,255,0.30)" : "#ffffff" }}
      />

      <button
        type="button"
        aria-label="increment"
        disabled={disabled}
        className="flex h-full w-10 items-center justify-center text-white/60 transition active:scale-90 active:text-white"
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(step);
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
