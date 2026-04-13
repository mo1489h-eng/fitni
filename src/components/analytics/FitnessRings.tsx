import { useEffect, useState } from "react";

const C = 2 * Math.PI;

function Ring({
  radius,
  pct,
  color,
  strokeWidth,
  show,
}: {
  radius: number;
  pct: number;
  color: string;
  strokeWidth: number;
  show: boolean;
}) {
  const len = C * radius;
  const dash = Math.max(0.01, (Math.min(100, pct) / 100) * len);
  const [draw, setDraw] = useState(0);
  useEffect(() => {
    if (!show) return;
    setDraw(0);
    const t = setTimeout(() => setDraw(dash), 80);
    return () => clearTimeout(t);
  }, [dash, show]);

  return (
    <circle
      cx="90"
      cy="90"
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      transform="rotate(-90 90 90)"
      strokeDasharray={`${draw} ${len}`}
      style={{ transition: "stroke-dasharray 1.5s ease-out" }}
      opacity={show ? 1 : 0.35}
    />
  );
}

/** Apple Fitness–style triple ring: compliance, attendance, volume (0–100 each). */
export function FitnessRings({
  compliance,
  attendance,
  volume,
  centerLabel,
  subLabel,
  size = 200,
  empty,
}: {
  compliance: number;
  attendance: number;
  volume: number;
  centerLabel: string;
  subLabel?: string;
  size?: number;
  empty?: boolean;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const tip = empty
    ? undefined
    : `الالتزام ${Math.round(compliance)}٪ — الحضور ${Math.round(attendance)}٪ — الحجم ${Math.round(volume)}٪`;

  return (
    <div className="mx-auto flex flex-col items-center gap-5" title={tip}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg viewBox="0 0 180 180" className="h-full w-full drop-shadow-[0_0_24px_rgba(34,197,94,0.12)]" aria-label="حلقات الأداء">
          <circle cx="90" cy="90" r="78" fill="none" stroke="#1f1f1f" strokeWidth="10" />
          <circle cx="90" cy="90" r="62" fill="none" stroke="#1f1f1f" strokeWidth="10" />
          <circle cx="90" cy="90" r="46" fill="none" stroke="#1f1f1f" strokeWidth="10" />
          {!empty ? (
            <>
              <Ring radius={78} pct={compliance} color="#22C55E" strokeWidth={10} show={show} />
              <Ring radius={62} pct={attendance} color="#3B82F6" strokeWidth={10} show={show} />
              <Ring radius={46} pct={volume} color="#F59E0B" strokeWidth={10} show={show} />
            </>
          ) : (
            <>
              <circle cx="90" cy="90" r="78" fill="none" stroke="#2a2a2a" strokeWidth="10" strokeDasharray="6 10" />
              <circle cx="90" cy="90" r="62" fill="none" stroke="#2a2a2a" strokeWidth="10" strokeDasharray="6 10" />
              <circle cx="90" cy="90" r="46" fill="none" stroke="#2a2a2a" strokeWidth="10" strokeDasharray="6 10" />
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[26px] font-bold tabular-nums leading-none text-white md:text-[30px]">{empty ? "—" : centerLabel}</p>
          {subLabel ? <p className="mt-1 max-w-[130px] text-[11px] leading-snug text-[#6b7280]">{subLabel}</p> : null}
        </div>
      </div>
      {!empty ? (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> التزام
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3B82F6]" /> حضور
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> حجم
          </span>
        </div>
      ) : null}
    </div>
  );
}
