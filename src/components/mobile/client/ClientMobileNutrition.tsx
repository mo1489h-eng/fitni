import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Beef, Check, Droplet, Flame, Loader2, Minus, Plus, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MEAL_TYPES = ["فطور", "غداء", "عشاء", "سناك"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_ICONS: Record<MealType, LucideIcon> = {
  فطور: Flame,
  غداء: UtensilsCrossed,
  عشاء: UtensilsCrossed,
  سناك: Beef,
};

const MEAL_EMOJI: Record<MealType, string> = {
  فطور: "🌅",
  غداء: "🥗",
  عشاء: "🍽️",
  سناك: "🍎",
};

const normalizeMealName = (name: string): MealType => {
  const n = name.trim();
  if (/فطور|الفطور|إفطار|الإفطار/i.test(n)) return "فطور";
  if (/غداء|الغداء/i.test(n)) return "غداء";
  if (/عشاء|العشاء/i.test(n)) return "عشاء";
  if (/سناك|وجبة خفيفة|خفيفة|snack/i.test(n)) return "سناك";
  for (const mt of MEAL_TYPES) {
    if (n.includes(mt)) return mt;
  }
  return "سناك";
};

type MealItem = {
  id: string;
  meal_name: string;
  food_name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  quantity: string | null;
  item_order: number | null;
};

type MealPlanRow = {
  id: string;
  name: string;
  notes: string | null;
  items: MealItem[];
};

type NutritionTodayRow = {
  completed_meals: string[] | null;
  water_glasses: number | null;
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
};

const BG = "#0E0E0F";
const CARD_BG = "#141414";
const CARD_BORDER = "rgba(255,255,255,0.08)";
const ACCENT = "#4F6F52";
const ACCENT_SOFT = "rgba(79,111,82,0.12)";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const WATER_BLUE = "#3B82F6";
const MUTED = "#888";
const FAINT = "#555";

const WATER_TARGET = 8;

function clampGlasses(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(WATER_TARGET + 2, Math.round(n)));
}

const ClientMobileNutrition = () => {
  const token = useMobilePortalToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: targets } = useQuery({
    queryKey: ["mobile-portal-nutrition-targets", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_portal_nutrition_targets", { p_token: token });
      if (error) throw error;
      return data as {
        calories_target?: number;
        protein_target?: number;
        carbs_target?: number;
        fat_target?: number;
      } | null;
    },
    enabled: !!token,
  });

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["mobile-portal-meal-plans", token],
    queryFn: async () => {
      if (!token) return [] as MealPlanRow[];
      const { data, error } = await supabase.rpc("get_portal_meal_plans", { p_token: token });
      if (error) throw error;
      if (Array.isArray(data)) return data as MealPlanRow[];
      if (data && typeof data === "object") return [data as MealPlanRow];
      return [];
    },
    enabled: !!token,
  });

  const todayKey = useMemo(() => ["mobile-portal-nutrition-today", token] as const, [token]);

  const { data: today } = useQuery({
    queryKey: todayKey,
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_portal_nutrition_today" as never, { p_token: token } as never);
      if (error) throw error;
      const parsed = (typeof data === "string" ? JSON.parse(data) : data) as NutritionTodayRow | null;
      return parsed;
    },
    enabled: !!token,
  });

  const toggleMealMutation = useMutation({
    mutationFn: async (payload: {
      mealName: MealType;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }) => {
      if (!token) throw new Error("رمز البوابة مفقود");
      const { data, error } = await supabase.rpc("toggle_meal_completion" as never, {
        p_token: token,
        p_meal_name: payload.mealName,
        p_calories: Math.round(payload.calories),
        p_protein: payload.protein,
        p_carbs: payload.carbs,
        p_fat: payload.fat,
      } as never);
      if (error) throw new Error(error.message || "تعذّر حفظ الوجبة");
      const result = (data ?? null) as { completed?: boolean; error?: string } | null;
      // The RPC returns `{error: 'Invalid token'}` on auth failures — treat
      // that as a hard error so the optimistic update rolls back.
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      const previous = queryClient.getQueryData<NutritionTodayRow | null>(todayKey);
      const current = previous ?? {
        completed_meals: [],
        water_glasses: 0,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      };
      const currentMeals = current.completed_meals ?? [];
      const isCompleted = currentMeals.includes(payload.mealName);
      const sign = isCompleted ? -1 : 1;
      const next: NutritionTodayRow = {
        completed_meals: isCompleted
          ? currentMeals.filter((m) => m !== payload.mealName)
          : [...currentMeals, payload.mealName],
        water_glasses: current.water_glasses ?? 0,
        total_calories: (current.total_calories ?? 0) + sign * Math.round(payload.calories),
        total_protein: (current.total_protein ?? 0) + sign * payload.protein,
        total_carbs: (current.total_carbs ?? 0) + sign * payload.carbs,
        total_fat: (current.total_fat ?? 0) + sign * payload.fat,
      };
      queryClient.setQueryData(todayKey, next);
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(todayKey, ctx.previous);
      }
      toast({
        title: "تعذّر حفظ الوجبة",
        description: err instanceof Error ? err.message : "حاول مجدداً",
        variant: "destructive",
      });
    },
    // Only invalidate on success — on error we already rolled back and don't
    // want a refetch to overwrite the rollback before the user sees it.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todayKey });
    },
  });

  const waterMutation = useMutation({
    mutationFn: async (glasses: number) => {
      if (!token) throw new Error("رمز البوابة مفقود");
      const { data, error } = await supabase.rpc("update_water_log" as never, {
        p_token: token,
        p_glasses: glasses,
      } as never);
      if (error) throw new Error(error.message || "تعذّر حفظ الماء");
      const result = (data ?? null) as { glasses?: number; error?: string } | null;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onMutate: async (glasses) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      const previous = queryClient.getQueryData<NutritionTodayRow | null>(todayKey);
      const current = previous ?? {
        completed_meals: [],
        water_glasses: 0,
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
      };
      queryClient.setQueryData(todayKey, { ...current, water_glasses: glasses });
      return { previous };
    },
    onError: (err, _glasses, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(todayKey, ctx.previous);
      }
      toast({
        title: "تعذّر حفظ الماء",
        description: err instanceof Error ? err.message : "حاول مجدداً",
        variant: "destructive",
      });
    },
    onSuccess: (result, glasses) => {
      // Use the server's authoritative value if present.
      const serverGlasses = typeof result?.glasses === "number" ? result.glasses : glasses;
      const current = queryClient.getQueryData<NutritionTodayRow | null>(todayKey);
      if (current) {
        queryClient.setQueryData(todayKey, { ...current, water_glasses: serverGlasses });
      }
      queryClient.invalidateQueries({ queryKey: todayKey });
    },
  });

  const plan = mealPlans?.[0];
  const items = plan?.items ?? [];
  const hasPlan = items.length > 0;

  const planItemsByMeal = useMemo(() => {
    const result: Record<MealType, MealItem[]> = {
      فطور: [],
      غداء: [],
      عشاء: [],
      سناك: [],
    };
    for (const item of items) {
      const key = normalizeMealName(item.meal_name);
      result[key].push(item);
    }
    for (const m of MEAL_TYPES) {
      result[m].sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0));
    }
    return result;
  }, [items]);

  const mealTotals = useMemo(() => {
    const result: Record<MealType, { calories: number; protein: number; carbs: number; fat: number }> = {
      فطور: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      غداء: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      عشاء: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      سناك: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
    for (const m of MEAL_TYPES) {
      for (const it of planItemsByMeal[m]) {
        result[m].calories += Number(it.calories) || 0;
        result[m].protein += Number(it.protein) || 0;
        result[m].carbs += Number(it.carbs) || 0;
        result[m].fat += Number(it.fats) || 0;
      }
    }
    return result;
  }, [planItemsByMeal]);

  const t = {
    calories_target: targets?.calories_target ?? 2000,
    protein_target: targets?.protein_target ?? 150,
    carbs_target: targets?.carbs_target ?? 250,
    fat_target: targets?.fat_target ?? 65,
  };

  const completedMealsSet = useMemo(
    () => new Set(today?.completed_meals ?? []),
    [today?.completed_meals]
  );
  const consumedCalories = Math.round(Number(today?.total_calories ?? 0));
  const consumedProtein = Number(today?.total_protein ?? 0);
  const consumedCarbs = Number(today?.total_carbs ?? 0);
  const consumedFat = Number(today?.total_fat ?? 0);
  const waterGlasses = clampGlasses(Number(today?.water_glasses ?? 0));

  const caloriePct = t.calories_target > 0 ? (consumedCalories / t.calories_target) * 100 : 0;
  const calorieColor =
    caloriePct > 100 ? RED : caloriePct >= 90 ? AMBER : ACCENT;

  const handleWaterSet = (next: number) => {
    const clamped = clampGlasses(next);
    if (clamped === waterGlasses) return;
    waterMutation.mutate(clamped);
  };

  const handleToggleMeal = (meal: MealType) => {
    const totals = mealTotals[meal];
    if (!totals) return;
    toggleMealMutation.mutate({
      mealName: meal,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    });
  };

  if (!token) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: CARD_BG, color: MUTED }}>
        لم يتم العثور على رمز البوابة. سجّل الخروج ثم الدخول مرة أخرى.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ background: BG }} dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">خطتي الغذائية</h1>
        {plan?.name ? (
          <p className="mt-1 text-sm" style={{ color: "#666" }}>
            {plan.name}
          </p>
        ) : null}
      </div>

      <CalorieSummaryCard
        consumed={consumedCalories}
        target={t.calories_target}
        color={calorieColor}
        protein={{ value: consumedProtein, target: t.protein_target }}
        carbs={{ value: consumedCarbs, target: t.carbs_target }}
        fat={{ value: consumedFat, target: t.fat_target }}
      />

      <WaterTrackerCard
        glasses={waterGlasses}
        onSet={handleWaterSet}
        disabled={waterMutation.isPending}
      />

      {!hasPlan ? (
        <EmptyMealPlanCard />
      ) : (
        <div className="space-y-3">
          {plan?.notes ? (
            <p className="px-1 text-[12px] leading-relaxed" style={{ color: "#888" }}>
              {plan.notes}
            </p>
          ) : null}
          {MEAL_TYPES.map((meal) => {
            const mealItems = planItemsByMeal[meal];
            if (mealItems.length === 0) return null;
            return (
              <MealCard
                key={meal}
                meal={meal}
                items={mealItems}
                totals={mealTotals[meal]}
                completed={completedMealsSet.has(meal)}
                onToggle={() => handleToggleMeal(meal)}
                pending={toggleMealMutation.isPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────── CalorieSummaryCard ─────────────────────── */

function CalorieSummaryCard({
  consumed,
  target,
  color,
  protein,
  carbs,
  fat,
}: {
  consumed: number;
  target: number;
  color: string;
  protein: { value: number; target: number };
  carbs: { value: number; target: number };
  fat: { value: number; target: number };
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl p-5"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center gap-5">
        <CalorieRing consumed={consumed} target={target} color={color} />
        <div className="flex-1 space-y-3">
          <MacroBar label="بروتين" color={ACCENT} value={protein.value} target={protein.target} unit="غ" />
          <MacroBar label="كربوهيدرات" color={AMBER} value={carbs.value} target={carbs.target} unit="غ" />
          <MacroBar label="دهون" color={RED} value={fat.value} target={fat.target} unit="غ" />
        </div>
      </div>
    </div>
  );
}

function CalorieRing({
  consumed,
  target,
  color,
}: {
  consumed: number;
  target: number;
  color: string;
}) {
  const size = 128;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(consumed / target, 1.25) : 0;
  const dashOffset = circumference * (1 - Math.min(pct, 1));
  const remaining = Math.max(0, target - consumed);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.45s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-black leading-none text-white tabular-nums">{consumed}</p>
        <p className="mt-1 text-[10px] font-medium" style={{ color: MUTED }}>
          من {target} سعرة
        </p>
        <p className="mt-1 text-[10px]" style={{ color: FAINT }}>
          {remaining > 0 ? `متبقي ${remaining}` : "اكتمل"}
        </p>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  color,
  value,
  target,
  unit,
}: {
  label: string;
  color: string;
  value: number;
  target: number;
  unit: string;
}) {
  const rounded = Math.round(value * 10) / 10;
  const pct = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-white">{label}</span>
        <span className="text-[10px] tabular-nums" style={{ color: MUTED }}>
          {rounded}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: "width 0.45s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────── WaterTrackerCard ─────────────────────── */

function WaterTrackerCard({
  glasses,
  onSet,
  disabled,
}: {
  glasses: number;
  onSet: (n: number) => void;
  disabled: boolean;
}) {
  const drops = Array.from({ length: WATER_TARGET }, (_, i) => i);
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          الماء <span aria-hidden>💧</span>
        </h3>
        <span className="text-[11px] tabular-nums" style={{ color: MUTED }}>
          {glasses} من {WATER_TARGET} أكواب
        </span>
      </div>

      <div className="flex items-center justify-between gap-2" dir="ltr">
        <button
          type="button"
          disabled={disabled || glasses <= 0}
          onClick={() => onSet(glasses - 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30"
          style={{ background: "rgba(255,255,255,0.06)", color: "#ccc" }}
          aria-label="إنقاص"
        >
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1.5">
          {drops.map((i) => {
            const filled = i < glasses;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onSet(filled && i === glasses - 1 ? i : i + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md transition active:scale-90"
                aria-label={filled ? `كوب ${i + 1} ممتلئ` : `كوب ${i + 1} فارغ`}
              >
                <Droplet
                  className="h-6 w-6 transition-colors"
                  strokeWidth={1.75}
                  style={{
                    color: filled ? WATER_BLUE : "rgba(255,255,255,0.18)",
                    fill: filled ? WATER_BLUE : "transparent",
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={disabled || glasses >= WATER_TARGET + 2}
          onClick={() => onSet(glasses + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30"
          style={{ background: `${WATER_BLUE}22`, color: WATER_BLUE }}
          aria-label="إضافة"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── MealCard ─────────────────────── */

function MealCard({
  meal,
  items,
  totals,
  completed,
  onToggle,
  pending,
}: {
  meal: MealType;
  items: MealItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  completed: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  const Icon = MEAL_ICONS[meal];
  const emoji = MEAL_EMOJI[meal];

  const cardBg = completed ? "rgba(79,111,82,0.08)" : CARD_BG;
  const cardBorder = completed ? "rgba(79,111,82,0.35)" : CARD_BORDER;

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        transition: "background 0.3s ease, border-color 0.3s ease, transform 0.2s ease",
        transform: completed ? "scale(0.995)" : "scale(1)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{
          background: completed ? ACCENT_SOFT : "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${CARD_BORDER}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-base">
            {emoji}
          </span>
          <Icon className="h-4 w-4" style={{ color: completed ? ACCENT : "#ccc" }} strokeWidth={1.75} />
          <p className="text-sm font-bold text-white">{meal}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums" style={{ color: MUTED }}>
            {Math.round(totals.calories)} سعرة
          </span>
          {completed ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-bold"
              style={{ background: ACCENT, color: "#0E0E0F" }}
            >
              <Check className="h-3 w-3" strokeWidth={3} /> تم
            </span>
          ) : null}
        </div>
      </div>

      <ul className="px-4 py-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-2 py-1 text-sm">
            <span aria-hidden style={{ color: completed ? ACCENT : FAINT }}>
              •
            </span>
            <span className="font-medium text-white">{item.food_name}</span>
            {item.quantity ? (
              <span className="text-[11px]" style={{ color: MUTED }}>
                ({item.quantity})
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-0"
      >
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: MUTED }}>
          <span>بروتين {Math.round(totals.protein)}g</span>
          <span>كارب {Math.round(totals.carbs)}g</span>
          <span>دهون {Math.round(totals.fat)}g</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold transition active:scale-95 disabled:opacity-60"
          style={{
            background: completed ? ACCENT : "rgba(255,255,255,0.06)",
            color: completed ? "#0E0E0F" : "#ddd",
            border: completed ? "none" : "1px solid rgba(255,255,255,0.12)",
          }}
          aria-pressed={completed}
        >
          {completed ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              تم ✓
            </>
          ) : (
            <>
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ border: "1.5px solid rgba(255,255,255,0.4)" }}
              />
              أتممت
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── EmptyMealPlanCard ─────────────────────── */

function EmptyMealPlanCard() {
  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <UtensilsCrossed className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
      <p className="text-sm font-semibold leading-relaxed text-white">لم يتم تعيين خطة غذائية بعد</p>
      <p className="mt-2 text-[12px] leading-relaxed" style={{ color: MUTED }}>
        تواصل مع مدربك لإضافة خطة غذائية
      </p>
    </div>
  );
}

export default ClientMobileNutrition;
