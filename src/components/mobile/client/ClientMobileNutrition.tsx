import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Beef, Flame, Loader2, UtensilsCrossed } from "lucide-react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";

const MEAL_TYPES = ["فطور", "غداء", "عشاء", "سناك"] as const;

const MEAL_ICONS: Record<string, typeof Flame> = {
  فطور: Flame,
  غداء: UtensilsCrossed,
  عشاء: UtensilsCrossed,
  سناك: Beef,
};

const normalizeMealName = (name: string): string => {
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

const ClientMobileNutrition = () => {
  const token = useMobilePortalToken();

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

  const plan = mealPlans?.[0];
  const items = plan?.items ?? [];
  const hasPlan = items.length > 0;

  const planItemsByMeal = useMemo(() => {
    const result: Record<string, MealItem[]> = {};
    MEAL_TYPES.forEach((m) => {
      result[m] = [];
    });
    for (const item of items) {
      const key = normalizeMealName(item.meal_name);
      if (!result[key]) result[key] = [];
      result[key].push(item);
    }
    for (const m of MEAL_TYPES) {
      result[m].sort((a, b) => (a.item_order ?? 0) - (b.item_order ?? 0));
    }
    return result;
  }, [items]);

  const t = targets ?? {
    calories_target: 2000,
    protein_target: 150,
    carbs_target: 200,
    fat_target: 65,
  };

  if (!token) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#111111", color: "#888" }}>
        لم يتم العثور على رمز البوابة. سجّل الخروج ثم الدخول مرة أخرى.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4f6f52" }} />
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-white">خطتي الغذائية</h1>
        <div className="rounded-2xl p-10 text-center" style={{ background: "#111111" }}>
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm leading-relaxed" style={{ color: "#888" }}>
            لم يتم تعيين خطة غذائية بعد
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">خطتي الغذائية</h1>
        <p className="mt-1 text-sm" style={{ color: "#666" }}>
          {plan?.name}
        </p>
        {plan?.notes ? (
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "#888" }}>
            {plan.notes}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl p-4" style={{ background: "#111111" }}>
        <p className="mb-3 text-xs font-bold" style={{ color: "#888" }}>
          أهداف يومية
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroPill label="سعرة" value={t.calories_target ?? "—"} />
          <MacroPill label="بروتين (غ)" value={t.protein_target ?? "—"} />
          <MacroPill label="كارب (غ)" value={t.carbs_target ?? "—"} />
          <MacroPill label="دهون (غ)" value={t.fat_target ?? "—"} />
        </div>
      </div>

      <div className="space-y-4">
        {MEAL_TYPES.map((meal) => {
          const mealItems = planItemsByMeal[meal] ?? [];
          if (mealItems.length === 0) return null;
          const MealIcon = MEAL_ICONS[meal] ?? UtensilsCrossed;
          const mealCals = mealItems.reduce((s, i) => s + (Number(i.calories) || 0), 0);
          return (
            <div key={meal} className="overflow-hidden rounded-2xl" style={{ background: "#111111" }}>
              <div
                className="border-b px-4 py-3"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(79,111,82,0.06)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MealIcon className="h-4 w-4 shrink-0" style={{ color: "#4f6f52" }} />
                    <p className="text-sm font-bold text-white">{meal}</p>
                  </div>
                  <span className="text-[10px]" style={{ color: "#666" }}>
                    {mealCals} سعرة
                  </span>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {mealItems.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-white">{item.food_name}</p>
                    <p className="mt-1 text-xs" style={{ color: "#888" }}>
                      {item.quantity || "—"} · {item.calories ?? "—"} سعرة
                      {item.protein != null ? ` · ب ${item.protein}غ` : ""}
                      {item.carbs != null ? ` · ك ${item.carbs}غ` : ""}
                      {item.fats != null ? ` · د ${item.fats}غ` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function MacroPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center" style={{ background: "rgba(79,111,82,0.1)" }}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px]" style={{ color: "#888" }}>
        {label}
      </p>
    </div>
  );
}

export default ClientMobileNutrition;
