interface MacroRingProps {
  value: number;
  target: number;
  color: string;
  label: string;
  size?: number;
  showPercent?: boolean;
}

const MacroRing = ({ value, target, color, label, size = 80, showPercent }: MacroRingProps) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const pct = Math.round(progress * 100);
  const dashOffset = circumference * (1 - progress);

  const statusColor = pct <= 80 ? color : pct <= 110 ? "hsl(125 17% 37%)" : pct <= 120 ? "hsl(45 93% 47%)" : "hsl(0 84% 60%)";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(0 0% 12%)" strokeWidth="6" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={statusColor} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercent ? (
            <span className="text-sm font-bold text-foreground">{pct}%</span>
          ) : (
            <span className="text-sm font-bold text-foreground">{value}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {!showPercent && <p className="text-[10px] text-muted-foreground">/ {target}</p>}
    </div>
  );
};

export default MacroRing;
