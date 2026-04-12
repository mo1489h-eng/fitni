import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import createBodyHighlighter, {
  ModelType,
  type IExerciseData,
} from "body-highlighter";
import { CB } from "./designTokens";

/** CoachBase logical groups → body-highlighter muscle slugs (front / back SVGs differ) */
const FRONT_MUSCLES: Record<string, readonly string[]> = {
  chest: ["chest"],
  shoulders: ["front-deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  core: ["abs", "obliques"],
  legs: ["quadriceps", "calves", "abductors", "knees"],
  back: [],
};

const BACK_MUSCLES: Record<string, readonly string[]> = {
  chest: [],
  shoulders: ["back-deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  core: ["lower-back"],
  legs: [
    "hamstring",
    "gluteal",
    "calves",
    "adductor",
    "abductors",
    "left-soleus",
    "right-soleus",
    "knees",
  ],
  back: ["trapezius", "upper-back", "lower-back"],
};

const FRESH = "#22C55E";
const HIGHLIGHT_PALETTE = [FRESH, "#F59E0B", "#EF4444", "#7C3AED"];

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

/** 1–4 maps to highlightedColors index (frequency − 1) */
function tierForHours(h: number | null): number {
  if (h == null) return 1;
  if (h > 72) return 1;
  if (h > 48) return 2;
  if (h > 24) return 3;
  return 4;
}

function matchLogicalGroup(muscleGroup: string): keyof typeof FRONT_MUSCLES {
  const k = muscleGroup.toLowerCase();
  if (k.includes("صدر") || k.includes("chest")) return "chest";
  if (k.includes("ظهر") || k.includes("back") || k.includes("lats") || k.includes("ترابيس")) return "back";
  if (k.includes("كتف") || k.includes("shoulder") || k.includes("delt")) return "shoulders";
  if (k.includes("ذراع") || k.includes("arm") || k.includes("biceps") || k.includes("triceps")) return "arms";
  if (k.includes("بطن") || k.includes("core") || k.includes("abs") || k.includes("وسط")) return "core";
  if (k.includes("رجل") || k.includes("leg") || k.includes("ساق") || k.includes("فخذ")) return "legs";
  return "chest";
}

/** One tier per SVG slug: min hours across logical groups that include that slug (avoids double-counting in body-highlighter). */
function buildSlugTierMap(minHoursByGroup: Partial<Record<string, number>>): Map<string, number> {
  const slugHours: Record<string, number[]> = {};
  const groups = new Set([...Object.keys(FRONT_MUSCLES), ...Object.keys(BACK_MUSCLES)]);
  for (const g of groups) {
    const hours = minHoursByGroup[g];
    if (hours == null) continue;
    const slugs = [...(FRONT_MUSCLES[g] ?? []), ...(BACK_MUSCLES[g] ?? [])];
    for (const slug of slugs) {
      (slugHours[slug] ??= []).push(hours);
    }
  }
  const slugTier = new Map<string, number>();
  for (const [slug, arr] of Object.entries(slugHours)) {
    slugTier.set(slug, tierForHours(Math.min(...arr)));
  }
  return slugTier;
}

function buildExerciseDataForView(
  map: Record<string, readonly string[]>,
  slugTier: Map<string, number>
): IExerciseData[] {
  const out: IExerciseData[] = [];
  const seen = new Set<string>();
  for (const [group, slugs] of Object.entries(map)) {
    for (const slug of slugs) {
      const tier = slugTier.get(slug);
      if (tier == null || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ name: group, muscles: [slug], frequency: tier });
    }
  }
  return out;
}

type Props = { clientId: string | null | undefined };

export default function MuscleRecoveryMap({ clientId }: Props) {
  const [tip, setTip] = useState<{ title: string; detail: string } | null>(null);
  const frontHostRef = useRef<HTMLDivElement>(null);
  const backHostRef = useRef<HTMLDivElement>(null);
  const frontHlRef = useRef<ReturnType<typeof createBodyHighlighter> | null>(null);
  const backHlRef = useRef<ReturnType<typeof createBodyHighlighter> | null>(null);

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

  const minHoursByGroup = useMemo(() => {
    const minH: Partial<Record<string, number>> = {};
    for (const [mg, iso] of Object.entries(muscleLast)) {
      const g = matchLogicalGroup(mg);
      const h = hoursSince(iso);
      if (h == null) continue;
      const prev = minH[g];
      if (prev == null || h < prev) minH[g] = h;
    }
    return minH;
  }, [muscleLast]);

  const slugTier = useMemo(() => buildSlugTierMap(minHoursByGroup), [minHoursByGroup]);
  const frontData = useMemo(() => buildExerciseDataForView(FRONT_MUSCLES, slugTier), [slugTier]);
  const backData = useMemo(() => buildExerciseDataForView(BACK_MUSCLES, slugTier), [slugTier]);

  const muscleLastRef = useRef(muscleLast);
  muscleLastRef.current = muscleLast;

  useEffect(() => {
    if (isLoading || !clientId) {
      frontHlRef.current?.destroy();
      backHlRef.current?.destroy();
      frontHlRef.current = null;
      backHlRef.current = null;
      return;
    }
    const frontEl = frontHostRef.current;
    const backEl = backHostRef.current;
    if (!frontEl || !backEl) return;

    const common = {
      bodyColor: FRESH,
      highlightedColors: HIGHLIGHT_PALETTE,
      style: { width: "100%", maxWidth: "11rem", margin: "0 auto" } as Record<string, string>,
      svgStyle: { maxHeight: "18rem" } as Record<string, string>,
      onClick: (stats: { muscle: string; data: { exercises: string[]; frequency: number } }) => {
        const muscle = stats.muscle;
        const last = muscleLastRef.current;
        const keys = Object.keys(last);
        const match = keys.find((k) => {
          const g = matchLogicalGroup(k);
          const frontSlugs = FRONT_MUSCLES[g] ?? [];
          const backSlugs = BACK_MUSCLES[g] ?? [];
          return frontSlugs.includes(muscle) || backSlugs.includes(muscle);
        });
        const iso = match ? last[match] : null;
        setTip({
          title: muscle,
          detail: iso ? new Date(iso).toLocaleDateString("ar-SA") : "لا بيانات",
        });
      },
    };

    if (!frontHlRef.current) {
      frontHlRef.current = createBodyHighlighter({
        ...common,
        container: frontEl,
        type: ModelType.ANTERIOR,
        data: frontData,
      });
    } else {
      frontHlRef.current.update({ data: frontData, onClick: common.onClick });
    }

    if (!backHlRef.current) {
      backHlRef.current = createBodyHighlighter({
        ...common,
        container: backEl,
        type: ModelType.POSTERIOR,
        data: backData,
      });
    } else {
      backHlRef.current.update({ data: backData, onClick: common.onClick });
    }
  }, [clientId, isLoading, frontData, backData]);

  useEffect(() => {
    return () => {
      frontHlRef.current?.destroy();
      backHlRef.current?.destroy();
      frontHlRef.current = null;
      backHlRef.current = null;
    };
  }, []);

  if (!clientId) return null;

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[16px] p-6" style={{ background: CB.card }}>
        <div className="mx-auto mb-4 h-64 max-w-[220px] rounded-[16px]" style={{ background: CB.card2 }} />
        <div className="h-3 w-2/3 rounded" style={{ background: CB.card2 }} />
      </div>
    );
  }

  return (
    <div className="rounded-[16px] p-4" style={{ background: CB.card, boxShadow: CB.shadow }}>
      <p className="mb-3 text-[16px] font-bold text-white">استشفاء العضلات</p>
      <p className="mb-4 text-[12px] leading-relaxed" style={{ color: CB.muted }}>
        بناءً على آخر 7 أيام من السجلات — أخضر طازج، أصفر متوسط، أحمر متعب، بنفسجي شديد الإجهاد
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-center text-[12px] font-semibold" style={{ color: CB.muted }}>
            أمامي
          </p>
          <div ref={frontHostRef} className="flex min-h-[280px] justify-center" dir="ltr" />
        </div>
        <div>
          <p className="mb-2 text-center text-[12px] font-semibold" style={{ color: CB.muted }}>
            خلفي
          </p>
          <div ref={backHostRef} className="flex min-h-[280px] justify-center" dir="ltr" />
        </div>
      </div>

      {tip && (
        <div
          className="relative z-10 mx-auto mt-4 max-w-[220px] rounded-[12px] px-3 py-2 text-center text-[12px] text-white"
          style={{ background: CB.card2, boxShadow: CB.shadow }}
        >
          <p className="font-semibold">{tip.title}</p>
          <p style={{ color: CB.muted }}>آخر تمرين: {tip.detail}</p>
          <button type="button" className="mt-2 text-[11px] underline" style={{ color: CB.accent }} onClick={() => setTip(null)}>
            إغلاق
          </button>
        </div>
      )}

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
