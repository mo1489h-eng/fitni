import { cn } from "@/lib/utils";

type Field = "weight" | "reps";

type Props = {
  field: Field;
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

const OLED = "#000000";
const KEY = "#0d0d0d";
const BORDER = "rgba(255,255,255,0.08)";

/**
 * Custom numeric keypad — avoids native keyboard latency on mobile.
 * Weight: supports decimals; quick jumps 0.5 / 1 / 2.5 kg.
 */
export function CustomKeypad({ field, value, onChange, className }: Props) {
  const append = (ch: string) => {
    if (ch === "." && field === "reps") return;
    if (ch === "." && value.includes(".")) return;
    if (value === "0" && ch !== ".") onChange(ch);
    else onChange(value + ch);
  };

  const back = () => onChange(value.slice(0, -1));

  const bumpWeight = (delta: number) => {
    const n = parseFloat(value) || 0;
    const next = Math.max(0, Math.round((n + delta) * 10) / 10);
    onChange(String(next));
  };

  const bumpReps = (delta: number) => {
    const n = parseInt(value, 10) || 0;
    onChange(String(Math.max(0, n + delta)));
  };

  return (
    <div className={cn("select-none rounded-2xl p-2", className)} style={{ background: OLED }}>
      <div className="grid grid-cols-3 gap-2">
        {field === "weight" && (
          <>
            <Adj label="-2.5" onClick={() => bumpWeight(-2.5)} />
            <Adj label="-1" onClick={() => bumpWeight(-1)} />
            <Adj label="-0.5" onClick={() => bumpWeight(-0.5)} />
          </>
        )}
        {field === "reps" && (
          <>
            <Adj label="-5" onClick={() => bumpReps(-5)} />
            <Adj label="-1" onClick={() => bumpReps(-1)} />
            <Adj label="+1" onClick={() => bumpReps(1)} />
          </>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Digit key={d} onClick={() => append(d)}>
            {d}
          </Digit>
        ))}
        <Digit onClick={() => field === "weight" && append(".")} muted={field === "reps"}>
          .
        </Digit>
        <Digit onClick={() => append("0")}>0</Digit>
        <div
          className="flex h-12 items-center justify-center rounded-xl text-sm font-bold text-white/60 active:scale-95"
          style={{ background: KEY, border: `1px solid ${BORDER}` }}
          onClick={back}
          role="button"
        >
          ⌫
        </div>
      </div>

      {field === "weight" && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Adj label="+0.5" onClick={() => bumpWeight(0.5)} />
          <Adj label="+1" onClick={() => bumpWeight(1)} />
          <Adj label="+2.5" onClick={() => bumpWeight(2.5)} />
        </div>
      )}
      {field === "reps" && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Adj label="+5" onClick={() => bumpReps(5)} />
        </div>
      )}
    </div>
  );
}

function Digit({
  children,
  onClick,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={muted}
      onClick={onClick}
      className="flex h-12 items-center justify-center rounded-xl text-lg font-bold text-white transition active:scale-95 disabled:opacity-0"
      style={{ background: KEY, border: `1px solid ${BORDER}` }}
    >
      {children}
    </button>
  );
}

function Adj({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-xl text-[11px] font-bold text-primary/90 transition active:scale-95"
      style={{ background: KEY, border: `1px solid ${BORDER}` }}
    >
      {label}
    </button>
  );
}
