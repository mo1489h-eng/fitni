import { useState, useMemo } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UtensilsCrossed, Check, Plus, Minus, Droplets } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MealItem {
  id: string;
  meal_name: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: string | null;
  item_order: number;
}

interface MealPlan {
  id: string;
  name: string;
  notes: string | null;
  items: MealItem[];
}

const MEAL_ICONS: Record<string, string> = {
  "فطور": "🌅", "وجبة خفيفة صباحية": "🍎", "غداء": "🍽️",
  "وجبة خفيفة مسائية": "🥜", "عشاء": "🌙", "وجبة قبل التمرين": "⚡",
  "وجبة بعد التمرين": "💪", "سناكس": "🍿",
};

// Circular ring component
const MacroRing = ({ value, target, color, label, icon, size = 72 }: {
  value: number; target: number; color: string; label: string; icon: string; size?: number;
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm">{icon}</span>
        </div>
      </div>
      <p className="text-xs font-bold text-foreground mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground">/ {target} {label}</p>
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
        p_token: token!,
        p_meal_item_id: mealItemId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-meal-logs", token] });
    },
  });

  const logged = loggedMeals || [];

  const addWater = () => {
    const next = Math.min(waterGlasses + 1, 12);
    setWaterGlasses(next);
    sessionStorage.setItem("water_today", String(next));
  };
  const removeWater = () => {
    const next = Math.max(waterGlasses - 1, 0);
    setWaterGlasses(next);
    sessionStorage.setItem("water_today", String(next));
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
      calories: acc.calories + (i.calories || 0),
      protein: acc.protein + (i.protein || 0),
      carbs: acc.carbs + (i.carbs || 0),
      fats: acc.fats + (i.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // Calculate logged macros
  const loggedMacros = useMemo(() => {
    if (!plans?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const allItems = plans.flatMap(p => p.items || []);
    return allItems
      .filter(i => logged.includes(i.id))
      .reduce((acc, i) => ({
        calories: acc.calories + (i.calories || 0),
        protein: acc.protein + (i.protein || 0),
        carbs: acc.carbs + (i.carbs || 0),
        fats: acc.fats + (i.fats || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [plans, logged]);

  const targetMacros = useMemo(() => {
    if (!plans?.length) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    return plans.reduce((acc, p) => {
      const t = totalMacros(p.items || []);
      return { calories: acc.calories + t.calories, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fats: acc.fats + t.fats };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [plans]);

  // Check streak
  const allMealsLogged = plans?.length ? plans.every(p => p.items.every(i => logged.includes(i.id))) : false;

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">جدولي الغذائي 🥗</h1>

        {!plans || plans.length === 0 ? (
          <Card className="p-10 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد خطة غذائية بعد</h3>
            <p className="text-sm text-muted-foreground">مدربك لم يضف لك خطة غذائية حتى الآن</p>
          </Card>
        ) : (
          <>
            {/* Circular Macro Rings */}
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-2 justify-items-center">
                <MacroRing value={loggedMacros.calories} target={targetMacros.calories} color="hsl(var(--primary))" label="سعرة" icon="🔥" />
                <MacroRing value={loggedMacros.protein} target={targetMacros.protein} color="hsl(220, 70%, 55%)" label="بروتين" icon="💪" />
                <MacroRing value={loggedMacros.carbs} target={targetMacros.carbs} color="hsl(35, 90%, 55%)" label="كارب" icon="🍚" />
                <MacroRing value={loggedMacros.fats} target={targetMacros.fats} color="hsl(340, 70%, 55%)" label="دهون" icon="🥑" />
              </div>
            </Card>

            {/* Water Tracking */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-foreground">💧 شرب الماء</span>
                </div>
                <span className="text-xs text-muted-foreground">{waterGlasses} / 8 أكواب</span>
              </div>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={removeWater}>
                  <Minus className="w-3 h-3" />
                </Button>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`flex-1 h-3 rounded-full transition-colors ${i < waterGlasses ? "bg-blue-500" : "bg-muted"}`} />
                  ))}
                </div>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={addWater}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </Card>

            {/* Meals */}
            {plans.map(plan => {
              const grouped = groupByMeal(plan.items);
              return (
                <div key={plan.id} className="space-y-3">
                  {Object.entries(grouped).map(([mealName, mealItems]) => {
                    const mealTotals = totalMacros(mealItems);
                    const allLogged = mealItems.every(i => logged.includes(i.id));
                    return (
                      <Card key={mealName} className={`overflow-hidden transition-all ${allLogged ? "opacity-60" : ""}`}>
                        <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{MEAL_ICONS[mealName] || "🍴"}</span>
                            <h3 className="font-semibold text-sm text-foreground">{mealName}</h3>
                          </div>
                          <span className="text-xs text-muted-foreground">{mealTotals.calories} سعرة</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {mealItems.map(item => {
                            const isLogged = logged.includes(item.id);
                            return (
                              <div key={item.id} className={`flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 ${isLogged ? "opacity-50" : ""}`}>
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    onClick={() => toggleMeal.mutate(item.id)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isLogged ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                                    }`}
                                  >
                                    {isLogged && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                                  </button>
                                  <div>
                                    <p className={`text-sm font-medium ${isLogged ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.food_name}</p>
                                    {item.quantity && <p className="text-xs text-muted-foreground">{item.quantity}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="bg-muted px-1.5 py-0.5 rounded">{item.calories}</span>
                                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">P:{item.protein}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {allLogged && (
                          <div className="px-4 py-2 bg-primary/5 text-center">
                            <span className="text-xs text-primary font-medium">✅ تم تسجيل الوجبة</span>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {plan.notes && (
                    <Card className="p-3 bg-accent/50">
                      <p className="text-xs text-muted-foreground">📝 ملاحظات المدرب: {plan.notes}</p>
                    </Card>
                  )}
                </div>
              );
            })}

            {/* Completion Banner */}
            {allMealsLogged && (
              <Card className="p-4 bg-primary/10 border-primary/20 text-center animate-fade-in">
                <p className="text-lg mb-1">✅</p>
                <p className="text-sm font-bold text-foreground">أكملت خطتك الغذائية اليوم!</p>
                <p className="text-xs text-muted-foreground mt-1">🔥 استمر على هذا النهج</p>
              </Card>
            )}
          </>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalNutrition;
