import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { LocalDay } from "./types";

interface Props {
  days: LocalDay[];
  weeks: number;
  currentWeek: number;
}

interface Warning {
  type: "error" | "warning" | "info";
  message: string;
}

const SmartWarnings = ({ days, weeks, currentWeek }: Props) => {
  const warnings: Warning[] = [];

  // Check consecutive muscle days
  const activeDays = days.filter(d => !d.isRest);
  for (let i = 0; i < activeDays.length - 1; i++) {
    const muscles1 = new Set(activeDays[i].exercises.map(e => e.muscle));
    const muscles2 = new Set(activeDays[i + 1].exercises.map(e => e.muscle));
    const overlap = [...muscles1].filter(m => muscles2.has(m) && m !== "كارديو" && m !== "كور");
    if (overlap.length > 0) {
      warnings.push({
        type: "warning",
        message: `${overlap.join("، ")} مكررة في يومين متتاليين - يُنصح بـ 48 ساعة راحة`,
      });
    }
  }

  // Check volume per muscle
  const muscleVolume: Record<string, number> = {};
  days.forEach(d => {
    d.exercises.forEach(e => {
      muscleVolume[e.muscle] = (muscleVolume[e.muscle] || 0) + e.sets;
    });
  });
  Object.entries(muscleVolume).forEach(([muscle, sets]) => {
    if (sets > 20 && muscle !== "كارديو") {
      warnings.push({
        type: "error",
        message: `حجم ${muscle} عالي جداً (${sets} مجموعة/أسبوع) - الحد الأقصى MRV ≈ 20`,
      });
    }
  });

  // Check deload
  if (currentWeek >= 4 && currentWeek % 4 !== 0) {
    const weeksWithoutDeload = currentWeek % 4;
    if (weeksWithoutDeload === 3) {
      warnings.push({
        type: "info",
        message: `الأسبوع القادم يُنصح بديلود (تقليل الحجم 40%)`,
      });
    }
  }

  // Check no exercises
  const emptyDays = activeDays.filter(d => d.exercises.length === 0);
  if (emptyDays.length > 0) {
    warnings.push({
      type: "warning",
      message: `${emptyDays.length} يوم تدريب بدون تمارين`,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
            w.type === "error"
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : w.type === "warning"
              ? "bg-warning/10 text-warning border border-warning/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          {w.type === "error" ? (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          ) : w.type === "warning" ? (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          ) : (
            <Info className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          )}
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
};

export default SmartWarnings;
