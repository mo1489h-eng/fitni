import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UtensilsCrossed, Apple, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  "فطور": "🌅",
  "وجبة خفيفة صباحية": "🍎",
  "غداء": "🍽️",
  "وجبة خفيفة مسائية": "🥜",
  "عشاء": "🌙",
  "وجبة قبل التمرين": "⚡",
  "وجبة بعد التمرين": "💪",
  "سناكس": "🍿",
};

const PortalNutrition = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const groupByMeal = (items: MealItem[]) => {
    const groups: Record<string, MealItem[]> = {};
    items.forEach((item) => {
      if (!groups[item.meal_name]) groups[item.meal_name] = [];
      groups[item.meal_name].push(item);
    });
    return groups;
  };

  const totalMacros = (items: MealItem[]) =>
    items.reduce(
      (acc, i) => ({
        calories: acc.calories + (i.calories || 0),
        protein: acc.protein + (i.protein || 0),
        carbs: acc.carbs + (i.carbs || 0),
        fats: acc.fats + (i.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

  const logged = loggedMeals || [];

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
      <div className="space-y-5 animate-fade-in" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">جدولي الغذائي 🥗</h1>
          <p className="text-sm text-muted-foreground mt-1">وجباتك اليومية المخصصة من مدربك</p>
        </div>

        {!plans || plans.length === 0 ? (
          <Card className="p-10 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد خطة غذائية بعد</h3>
            <p className="text-sm text-muted-foreground">مدربك لم يضف لك خطة غذائية حتى الآن</p>
          </Card>
        ) : (
          plans.map((plan) => {
            const totals = totalMacros(plan.items);
            const grouped = groupByMeal(plan.items);
            const loggedCalories = plan.items
              .filter(i => logged.includes(i.id))
              .reduce((sum, i) => sum + (i.calories || 0), 0);
            const calorieProgress = totals.calories > 0 ? Math.min((loggedCalories / totals.calories) * 100, 100) : 0;

            return (
              <div key={plan.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                </div>

                {/* Daily progress */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">تقدم اليوم</p>
                    <p className="text-xs font-bold text-primary">
                      {loggedCalories} من {totals.calories} سعرة
                    </p>
                  </div>
                  <Progress value={calorieProgress} className="h-2.5 mb-3" />
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-foreground">{totals.calories}</div>
                      <div className="text-[10px] text-muted-foreground">سعرة</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary">{totals.protein}g</div>
                      <div className="text-[10px] text-muted-foreground">بروتين</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{totals.carbs}g</div>
                      <div className="text-[10px] text-muted-foreground">كربوهيدرات</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{totals.fats}g</div>
                      <div className="text-[10px] text-muted-foreground">دهون</div>
                    </div>
                  </div>
                </Card>

                {/* Meals */}
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
                        {mealItems.map((item) => {
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
                                  {item.quantity && (
                                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 text-[10px] text-muted-foreground">
                                <span className="bg-muted px-1.5 py-0.5 rounded">{item.calories} cal</span>
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">P:{item.protein}</span>
                                <span className="bg-muted px-1.5 py-0.5 rounded">C:{item.carbs}</span>
                                <span className="bg-muted px-1.5 py-0.5 rounded">F:{item.fats}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
          })
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalNutrition;
