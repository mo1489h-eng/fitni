import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UtensilsCrossed, Apple } from "lucide-react";

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
};

const PortalNutrition = () => {
  const { token } = useParams();

  const { data: client } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!token,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["portal-nutrition", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_meal_plans" as any, {
        p_token: token!,
      });
      if (error) throw error;
      return (data || []) as MealPlan[];
    },
    enabled: !!token,
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
          <h1 className="text-2xl font-bold text-foreground">خطتي الغذائية 🍏</h1>
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
            return (
              <div key={plan.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                </div>

                {/* Daily totals */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-2">إجمالي اليوم</p>
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
                  return (
                    <Card key={mealName} className="overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{MEAL_ICONS[mealName] || "🍴"}</span>
                          <h3 className="font-semibold text-sm text-foreground">{mealName}</h3>
                        </div>
                        <span className="text-xs text-muted-foreground">{mealTotals.calories} سعرة</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {mealItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.food_name}</p>
                              {item.quantity && (
                                <p className="text-xs text-muted-foreground">{item.quantity}</p>
                              )}
                            </div>
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              <span className="bg-muted px-1.5 py-0.5 rounded">{item.calories} cal</span>
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">P:{item.protein}</span>
                              <span className="bg-muted px-1.5 py-0.5 rounded">C:{item.carbs}</span>
                              <span className="bg-muted px-1.5 py-0.5 rounded">F:{item.fats}</span>
                            </div>
                          </div>
                        ))}
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
