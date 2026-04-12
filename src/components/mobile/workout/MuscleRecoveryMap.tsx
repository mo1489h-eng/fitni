import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CB } from "./designTokens";

const REGIONS = [
  { id: "chest", label: "صدر", path: "M 70 95 L 130 95 L 125 140 L 75 140 Z" },
  { id: "shoulders", label: "كتف", path: "M 55 100 L 70 95 L 75 140 L 60 145 Z" },
  { id: "shoulders_r", label: "كتف", path: "M 145 100 L 130 95 L 125 140 L 140 145 Z" },
  { id: "arms", label: "ذراع", path: "M 45 120 L 60 145 L 55 200 L 40 190 Z" },
  { id: "arms_r", label: "ذراع", path: "M 155 120 L 140 145 L 145 200 L 160 190 Z" },
  { id: "core", label: "بطن", path: "M 75 145 L 125 145 L 120 200 L 80 200 Z" },
  { id: "legs", label: "أرجل", path: "M 80 205 L 120 205 L 115 280 L 85 280 Z" },
] as const;

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function colorForHours(h: number | null): string {
  if (h == null) return "#22C55E";
  if (h > 72) return "#22C55E";
  if (h > 48) return "#F59E0B";
  if (h > 24) return "#EF4444";
  return "#7C3AED";
}

function matchRegion(muscleGroup: string): string {
  const k = muscleGroup.toLowerCase();
  if (k.includes("صدر") || k.includes("chest")) return "chest";
  if (k.includes("ظهر") || k.includes("back")) return "core";
  if (k.includes("كتف") || k.includes("shoulder")) return "shoulders";
  if (k.includes("ذراع") || k.includes("arm")) return "arms";
  if (k.includes("بطن") || k.includes("core") || k.includes("abs")) return "core";
  if (k.includes("رجل") || k.includes("leg") || k.includes("ساق")) return "legs";
  return "chest";
}

type Props = { clientId: string | null | undefined };

export default function MuscleRecoveryMap({ clientId }: Props) {
  const [tip, setTip] = useState<{ label: string; date: string } | null>(null);

  const { data: muscleLast = {}, isLoading } = useQuery({
    queryKey: ["muscle-recovery", clientId],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!clientId) return {};
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data: logs, error } = await supabase
        .from("workout_logs")
        .select(
          `
          logged_at,
          program_exercises (
            exercise_library ( muscle_group )
          )
        `
        )
        .eq("client_id", clientId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: false });
      if (error) {
        const { data: simple } = await supabase
          .from("workout_logs")
          .select("logged_at")
          .eq("client_id", clientId)
          .gte("logged_at", since.toISOString())
          .order("logged_at", { ascending: false })
          .limit(1);
        const row = simple?.[0];
        return row ? { عام: row.logged_at } : {};
      }
      const lastByMuscle: Record<string, string> = {};
      for (const row of logs || []) {
        const pe = row.program_exercises as { exercise_library?: { muscle_group?: string } | null } | null;
        const mg = pe?.exercise_library?.muscle_group?.trim() || "عام";
        if (!lastByMuscle[mg]) lastByMuscle[mg] = row.logged_at;
      }
      return lastByMuscle;
    },
    enabled: !!clientId,
  });

  const regionColors = useMemo(() => {
    const minH: Record<string, number> = {};
    for (const [mg, iso] of Object.entries(muscleLast)) {
      const rid = matchRegion(mg);
      const h = hoursSince(iso);
      if (h == null) continue;
      const prev = minH[rid];
      if (prev == null || h < prev) minH[rid] = h;
    }
    const colors = new Map<string, string>();
    for (const [rid, h] of Object.entries(minH)) {
      colors.set(rid, colorForHours(h));
    }
    for (const r of REGIONS) {
      if (!colors.has(r.id)) colors.set(r.id, "#22C55E");
    }
    return colors;
  }, [muscleLast]);

  if (!clientId) return null;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[16px] p-6" style={{ background: CB.card }}>
        <div className="mx-auto mb-4 h-64 max-w-[200px] rounded-[16px]" style={{ background: CB.card2 }} />
        <div className="h-3 w-2/3 rounded" style={{ background: CB.card2 }} />
      </div>
    );
  }

  return (
    <div className="rounded-[16px] p-4" style={{ background: CB.card, boxShadow: CB.shadow }}>
      <p className="mb-3 text-[16px] font-bold text-white">استشفاء العضلات</p>
      <p className="mb-4 text-[12px] leading-relaxed" style={{ color: CB.muted }}>
        بناءً على آخر 7 أيام من السجلات
      </p>
      <div className="relative mx-auto max-w-[220px]">
        <svg viewBox="0 0 200 320" className="w-full">
          <ellipse cx="100" cy="40" rx="28" ry="32" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
          {REGIONS.map((r) => (
            <path
              key={r.id}
              d={r.path}
              fill={regionColors.get(r.id) ?? "#22C55E"}
              fillOpacity={0.88}
              stroke="#0a0a0a"
              strokeWidth={1}
              className="cursor-pointer transition-transform active:scale-95"
              onClick={() => {
                const keys = Object.keys(muscleLast);
                const mg = keys.find((k) => matchRegion(k) === r.id.split("_")[0]) || r.label;
                const iso = muscleLast[mg];
                setTip({
                  label: mg,
                  date: iso ? new Date(iso).toLocaleDateString("ar-SA") : "لا بيانات",
                });
              }}
            />
          ))}
        </svg>
        {tip && (
          <div
            className="absolute left-1/2 top-1/2 z-10 max-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] px-3 py-2 text-center text-[12px] text-white"
            style={{ background: CB.card2, boxShadow: CB.shadow }}
          >
            <p className="font-semibold">{tip.label}</p>
            <p style={{ color: CB.muted }}>آخر تمرين: {tip.date}</p>
            <button type="button" className="mt-2 text-[11px] underline" style={{ color: CB.accent }} onClick={() => setTip(null)}>
              إغلاق
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]" style={{ color: CB.muted }}>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#22C55E" }} /> طازج
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} /> متوسط
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#EF4444" }} /> متعب
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#7C3AED" }} /> شديد
        </span>
      </div>
    </div>
  );
}
