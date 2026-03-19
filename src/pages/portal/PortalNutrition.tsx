import { useState, useMemo } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, UtensilsCrossed, Check, Plus, Minus, Droplet, Flame,
  Beef, Wheat, Droplets, CheckCircle, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MealItem {
  id: string; meal_name: string; food_name: string; calories: number;
  protein: number; carbs: number; fats: number; quantity: string | null; item_order: number;
}
interface MealPlan {
  id: string; name: string; notes: string | null; items: MealItem[];
}

const MEAL_ICONS: Record<string, typeof Flame> = {
  "فطور": Flame, "غداء": UtensilsCrossed, "عشاء": UtensilsCrossed,
  "وجبة خفيفة صباحية": Beef, "وجبة خفيفة مسائية": Beef,
  "وجبة قبل التمرين": Flame, "وجبة بعد التمرين": Beef, "سناكس": Wheat,
};

const MacroRing = ({ value, target, color, label, icon: Icon, size = 72 }: {
  value: number; target: number; color: string; label: string; icon: typeof Flame; size?: number;
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(0 0% 10%)" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-xs font-bold text-white mt-1">{value}</p>
      <p className="text-[10px] text-[hsl(0_0%_35%)]">/ {target} {label}</p>
    </div>
  );
};

const PortalNutrition = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [waterGlasses, setWaterGlasses] = useState(() => {
    const saved = sessionStorage.getItem("water_today");
    return saved ? Number(saved) : 0;
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["portal-nutrition", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_meal_plans" as any, { p_token: token! });
      if (error) throw error;
      return (data || []) as MealPlan[];
    },
    enabled: !!token,
  });

  const { data: loggedMeals } = useQuery({
    queryKey: ["portal-meal-logs", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_meal_logs" as any, { p_token: token! });
      if (error) throw error;
      return (data || []).map((d: any) => d.meal_item_id) as string[];
    },
    enabled: !!token,
  });

  const toggleMeal = useMutation({
    mutationFn: async (mealItemId: string) => {
      const { error } = await supabase.rpc("toggle_portal_meal_log" as any, {
        p_token: token!, p_meal_item_id: mealItemId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal-meal-logs", token] }),
  });

  const logged = loggedMeals || [];

  const setWater = (n: number) => {
    const v = Math.max(0, Math.min(n, 12));
    setWaterGlasses(v);
    sessionStorage.setItem("water_today", String(v));
  };

  const groupByMeal = (items: MealItem[]) => {
    const groups: Record<string, MealItem[]> = {};
    items.forEach(item => {
      if (!groups[item.meal_name]) groups[item.meal_name] = [];
      groups[item.meal_name].push(item);
    });
    return groups;
  };

  const totalMacros = (items: MealItem[]) =>
    items.reduce((acc, i) => ({
      calories: acc.calories + (i.calories || 0), protein: acc.protein + (i.protein || 0),
      carbs: acc.carbs + (i.carbs || 0), fats: acc.fats + (i.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const loggedMacros = useMemo(() => {
    if (!plans?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const allItems = plans.flatMap(p => p.items || []);
    return allItems.filter(i => logged.includes(i.id))
      .reduce((acc, i) => ({
        calories: acc.calories + (i.calories || 0), protein: acc.protein + (i.protein || 0),
        carbs: acc.carbs + (i.carbs || 0), fats: acc.fats + (i.fats || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [plans, logged]);

  const targetMacros = useMemo(() => {
    if (!plans?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return plans.reduce((acc, p) => {
      const t = totalMacros(p.items || []);
      return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fats: acc.fats + t.fats };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [plans]);

  const allMealsLogged = plans?.length ? plans.every(p => p.items.every(i => logged.includes(i.id))) : false;

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" strokeWidth={1.5} />
          تغذيتي
        </h1>

        {!plans || plans.length === 0 ? (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-10 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-[hsl(0_0%_20%)] mb-3" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-white mb-1">لا توجد خطة غذائية بعد</h3>
            <p className="text-sm text-[hsl(0_0%_40%)]">مدربك لم يضف لك خطة غذائية حتى الآن</p>
          </div>
        ) : (
          <>
            {/* Macro Rings */}
            <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
              <div className="grid grid-cols-4 gap-2 justify-items-center">
                <MacroRing value={loggedMacros.calories} target={targetMacros.calories} color="hsl(142 76% 36%)" label="سعرة" icon={Flame} />
                <MacroRing value={loggedMacros.protein} target={targetMacros.protein} color="hsl(220 70% 55%)" label="بروتين" icon={Beef} />
                <MacroRing value={loggedMacros.carbs} target={targetMacros.carbs} color="hsl(35 90% 55%)" label="كارب" icon={Wheat} />
                <MacroRing value={loggedMacros.fats} target={targetMacros.fats} color="hsl(340 70% 55%)" label="دهون" icon={Droplets} />
              </div>
            </div>

            {/* Water Tracking */}
            <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-white">شرب الماء</span>
                </div>
                <span className="text-xs text-[hsl(0_0%_40%)]">{waterGlasses} / 8 أكواب</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setWater(waterGlasses - 1)}
                  className="w-8 h-8 rounded-full border border-[hsl(0_0%_15%)] flex items-center justify-center text-[hsl(0_0%_40%)] hover:text-white hover:border-[hsl(0_0%_25%)] transition-colors">
                  <Minus className="w-3 h-3" strokeWidth={1.5} />
                </button>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button key={i} onClick={() => setWater(i + 1)}
                      className={`flex-1 h-3 rounded-full transition-colors ${i < waterGlasses ? "bg-blue-500" : "bg-[hsl(0_0%_12%)]"}`} />
                  ))}
                </div>
                <button onClick={() => setWater(waterGlasses + 1)}
                  className="w-8 h-8 rounded-full border border-[hsl(0_0%_15%)] flex items-center justify-center text-[hsl(0_0%_40%)] hover:text-white hover:border-[hsl(0_0%_25%)] transition-colors">
                  <Plus className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Meals */}
            {plans.map(plan => {
              const grouped = groupByMeal(plan.items);
              return (
                <div key={plan.id} className="space-y-3">
                  {Object.entries(grouped).map(([mealName, mealItems]) => {
                    const mealTotals = totalMacros(mealItems);
                    const allLogged = mealItems.every(i => logged.includes(i.id));
                    const MealIcon = MEAL_ICONS[mealName] || UtensilsCrossed;
                    return (
                      <div key={mealName} className={`bg-[hsl(0_0%_6%)] rounded-xl border overflow-hidden transition-all ${
                        allLogged ? "border-primary/20 opacity-60" : "border-[hsl(0_0%_10%)]"
                      }`}>
                        <div className="px-4 py-3 flex items-center justify-between border-b border-[hsl(0_0%_8%)]">
                          <div className="flex items-center gap-2">
                            <MealIcon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                            <h3 className="font-semibold text-sm text-white">{mealName}</h3>
                          </div>
                          <span className="text-xs text-[hsl(0_0%_40%)]">{mealTotals.calories} سعرة</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {mealItems.map(item => {
                            const isLogged = logged.includes(item.id);
                            return (
                              <div key={item.id} className={`flex items-center justify-between py-1.5 border-b border-[hsl(0_0%_8%)] last:border-0 ${isLogged ? "opacity-50" : ""}`}>
                                <div className="flex items-center gap-2 flex-1">
                                  <button onClick={() => toggleMeal.mutate(item.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isLogged ? "bg-primary border-primary" : "border-[hsl(0_0%_20%)] hover:border-primary"
                                    }`}>
                                    {isLogged && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2} />}
                                  </button>
                                  <div>
                                    <p className={`text-sm font-medium ${isLogged ? "line-through text-[hsl(0_0%_35%)]" : "text-white"}`}>{item.food_name}</p>
                                    {item.quantity && <p className="text-xs text-[hsl(0_0%_35%)]">{item.quantity}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1 text-[10px]">
                                  <span className="bg-[hsl(0_0%_10%)] text-[hsl(0_0%_50%)] px-1.5 py-0.5 rounded">{item.calories}</span>
                                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">P:{item.protein}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {allLogged && (
                          <div className="px-4 py-2 bg-primary/5 flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                            <span className="text-xs text-primary font-medium">تم تسجيل الوجبة</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {plan.notes && (
                    <div className="bg-[hsl(0_0%_5%)] rounded-xl border border-[hsl(0_0%_8%)] p-3 flex items-start gap-2">
                      <FileText className="w-4 h-4 text-[hsl(0_0%_30%)] mt-0.5 shrink-0" strokeWidth={1.5} />
                      <p className="text-xs text-[hsl(0_0%_40%)]">ملاحظات المدرب: {plan.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {allMealsLogged && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center animate-fade-in">
                <CheckCircle className="w-6 h-6 text-primary mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-sm font-bold text-white">أكملت خطتك الغذائية اليوم</p>
                <p className="text-xs text-[hsl(0_0%_40%)] mt-1">استمر على هذا النهج</p>
              </div>
            )}
          </>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalNutrition;
