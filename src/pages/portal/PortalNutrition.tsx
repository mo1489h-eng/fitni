import { useState, useMemo } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Loader2, UtensilsCrossed, Check, Plus, Minus, Droplet, Flame,
  Beef, Wheat, Droplets, CheckCircle, FileText, Search, X, TrendingUp,
  BarChart3, Calendar as CalendarIcon, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MacroRing from "@/components/nutrition/MacroRing";
import NutritionDayChart from "@/components/nutrition/NutritionDayChart";
import FoodSearch, { FoodItem } from "@/components/nutrition/FoodSearch";

const MEAL_TYPES = ["فطور", "غداء", "عشاء", "سناك"] as const;
const MEAL_ICONS: Record<string, typeof Flame> = {
  "فطور": Flame, "غداء": UtensilsCrossed, "عشاء": UtensilsCrossed, "سناك": Beef,
};

const PortalNutrition = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("today");
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string>("فطور");
  const [logQuantity, setLogQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [customFood, setCustomFood] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isCustom, setIsCustom] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(() => Number(sessionStorage.getItem("water_today") || 0));

  // Fetch targets
  const { data: targets } = useQuery({
    queryKey: ["portal-nutrition-targets", token],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_portal_nutrition_targets" as any, { p_token: token! });
      return data as any || { calories_target: 2000, protein_target: 150, carbs_target: 200, fat_target: 65 };
    },
    enabled: !!token,
  });

  // Fetch today's logs
  const { data: todayLogs, isLoading } = useQuery({
    queryKey: ["portal-nutrition-logs", token, "today"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_portal_nutrition_logs" as any, { p_token: token! });
      return (data || []) as any[];
    },
    enabled: !!token,
  });

  // Fetch weekly data
  const { data: weeklyData } = useQuery({
    queryKey: ["portal-nutrition-weekly", token],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_portal_nutrition_weekly" as any, { p_token: token! });
      return (data || []) as any[];
    },
    enabled: !!token,
  });

  // Also fetch old meal plans for "planned" overlay
  const { data: mealPlans } = useQuery({
    queryKey: ["portal-meal-plans", token],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_portal_meal_plans" as any, { p_token: token! });
      return (data || []) as any[];
    },
    enabled: !!token,
  });

  // Log food mutation
  const logFood = useMutation({
    mutationFn: async (params: any) => {
      const { error } = await supabase.rpc("portal_log_food" as any, {
        p_token: token!,
        p_meal_type: params.meal_type,
        p_food_name_ar: params.food_name_ar,
        p_food_name_en: params.food_name_en || "",
        p_quantity_grams: params.quantity_grams,
        p_calories: params.calories,
        p_protein: params.protein,
        p_carbs: params.carbs,
        p_fat: params.fat,
        p_food_id: params.food_id || null,
        p_is_custom: params.is_custom || false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["portal-nutrition-weekly"] });
      setShowLogSheet(false);
      setSelectedFood(null);
      setIsCustom(false);
      toast({ title: "تم تسجيل الوجبة" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Delete log
  const deleteLog = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.rpc("portal_delete_food_log" as any, { p_token: token!, p_log_id: logId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["portal-nutrition-weekly"] });
    },
  });

  const logs = todayLogs || [];
  const t = targets || { calories_target: 2000, protein_target: 150, carbs_target: 200, fat_target: 65 };

  const todayTotals = useMemo(() =>
    logs.reduce((acc: any, l: any) => ({
      calories: acc.calories + (Number(l.calories) || 0),
      protein: acc.protein + (Number(l.protein) || 0),
      carbs: acc.carbs + (Number(l.carbs) || 0),
      fat: acc.fat + (Number(l.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 }),
    [logs]
  );

  // Calculate streak from weekly data
  const streak = useMemo(() => {
    const wk = weeklyData || [];
    let count = 0;
    for (let i = wk.length - 1; i >= 0; i--) {
      if (wk[i].calories > 0) count++;
      else break;
    }
    return count;
  }, [weeklyData]);

  const weekly = weeklyData || [];
  const daysLogged = weekly.filter((d: any) => d.calories > 0).length;
  const avgCalories = daysLogged > 0 ? Math.round(weekly.reduce((s: number, d: any) => s + Number(d.calories || 0), 0) / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round(weekly.reduce((s: number, d: any) => s + Number(d.protein || 0), 0) / daysLogged) : 0;

  const setWater = (n: number) => {
    const v = Math.max(0, Math.min(n, 12));
    setWaterGlasses(v);
    sessionStorage.setItem("water_today", String(v));
  };

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    setLogQuantity(food.serving_size_default || 100);
    setIsCustom(false);
  };

  const handleConfirmLog = () => {
    if (isCustom) {
      if (!customFood.name.trim()) return;
      logFood.mutate({
        meal_type: selectedMeal,
        food_name_ar: customFood.name,
        quantity_grams: logQuantity,
        calories: customFood.calories,
        protein: customFood.protein,
        carbs: customFood.carbs,
        fat: customFood.fat,
        is_custom: true,
      });
    } else if (selectedFood) {
      const factor = logQuantity / 100;
      logFood.mutate({
        meal_type: selectedMeal,
        food_name_ar: selectedFood.name_ar,
        food_name_en: selectedFood.name_en,
        food_id: selectedFood.id,
        quantity_grams: logQuantity,
        calories: Math.round(selectedFood.calories_per_100g * factor),
        protein: Math.round(selectedFood.protein_per_100g * factor),
        carbs: Math.round(selectedFood.carbs_per_100g * factor),
        fat: Math.round(selectedFood.fat_per_100g * factor),
      });
    }
  };

  const openLogSheet = (meal: string) => {
    setSelectedMeal(meal);
    setSelectedFood(null);
    setIsCustom(false);
    setLogQuantity(100);
    setShowLogSheet(true);
  };

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
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          تغذيتي
        </h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 bg-card border border-border">
            <TabsTrigger value="today" className="text-xs gap-1"><CalendarIcon className="w-3 h-3" />اليوم</TabsTrigger>
            <TabsTrigger value="week" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />أسبوعي</TabsTrigger>
            <TabsTrigger value="plan" className="text-xs gap-1"><FileText className="w-3 h-3" />الخطة</TabsTrigger>
          </TabsList>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-4 mt-3">
            {/* Hero Calorie Ring */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-center gap-6">
                <MacroRing value={todayTotals.calories} target={t.calories_target} color="hsl(142 76% 36%)" label="سعرة" size={100} />
                <div className="space-y-2 text-sm">
                  <p className="text-foreground font-bold">
                    {todayTotals.calories} <span className="text-muted-foreground font-normal">من أصل {t.calories_target}</span>
                  </p>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 text-primary text-xs">
                      <Flame className="w-3 h-3" /> {streak} يوم متتالي
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <MacroRing value={todayTotals.protein} target={t.protein_target} color="hsl(220 70% 55%)" label="بروتين" size={60} />
                <MacroRing value={todayTotals.carbs} target={t.carbs_target} color="hsl(35 90% 55%)" label="كارب" size={60} />
                <MacroRing value={todayTotals.fat} target={t.fat_target} color="hsl(340 70% 55%)" label="دهون" size={60} />
              </div>
            </div>

            {/* Water */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-foreground">شرب الماء</span>
                </div>
                <span className="text-xs text-muted-foreground">{waterGlasses} / 8 أكواب</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setWater(waterGlasses - 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Minus className="w-3 h-3" />
                </button>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button key={i} onClick={() => setWater(i + 1)}
                      className={`flex-1 h-3 rounded-full transition-colors ${i < waterGlasses ? "bg-blue-500" : "bg-muted"}`} />
                  ))}
                </div>
                <button onClick={() => setWater(waterGlasses + 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Meal Cards */}
            {MEAL_TYPES.map(meal => {
              const mealLogs = logs.filter((l: any) => l.meal_type === meal);
              const mealCals = mealLogs.reduce((s: number, l: any) => s + (Number(l.calories) || 0), 0);
              const MealIcon = MEAL_ICONS[meal] || UtensilsCrossed;
              return (
                <div key={meal} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2">
                      <MealIcon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm text-foreground">{meal}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {mealCals > 0 && <span className="text-xs text-muted-foreground">{mealCals} سعرة</span>}
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openLogSheet(meal)}>
                        <Plus className="w-3 h-3" /> سجّل
                      </Button>
                    </div>
                  </div>
                  {mealLogs.length > 0 && (
                    <div className="p-3 space-y-1">
                      {mealLogs.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-2 flex-1">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <p className="text-sm text-foreground">{l.food_name_ar}</p>
                              <p className="text-xs text-muted-foreground">{l.quantity_grams}g</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{l.calories} سعرة</span>
                            <button onClick={() => deleteLog.mutate(l.id)} className="text-destructive hover:text-destructive/80">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {mealLogs.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">لم تسجل شيء بعد</p>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* WEEK TAB */}
          <TabsContent value="week" className="space-y-4 mt-3">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> السعرات — آخر 7 أيام
              </h3>
              <NutritionDayChart data={weekly} target={t.calories_target} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{daysLogged}<span className="text-muted-foreground text-sm">/7</span></p>
                <p className="text-xs text-muted-foreground mt-1">أيام مسجلة</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-primary">{Math.round((daysLogged / 7) * 100)}%</p>
                <p className="text-xs text-muted-foreground mt-1">نسبة الالتزام</p>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">المتوسطات</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{avgCalories}</p>
                    <p className="text-xs text-muted-foreground">متوسط السعرات</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Beef className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{avgProtein}g</p>
                    <p className="text-xs text-muted-foreground">متوسط البروتين</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PLAN TAB (old meal plans) */}
          <TabsContent value="plan" className="space-y-4 mt-3">
            {!mealPlans || mealPlans.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد خطة غذائية من المدرب</p>
              </div>
            ) : (
              mealPlans.map((plan: any) => {
                const grouped: Record<string, any[]> = {};
                (plan.items || []).forEach((item: any) => {
                  if (!grouped[item.meal_name]) grouped[item.meal_name] = [];
                  grouped[item.meal_name].push(item);
                });
                return (
                  <div key={plan.id} className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                    {Object.entries(grouped).map(([mealName, mealItems]) => (
                      <div key={mealName} className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">{mealName}</span>
                          <span className="text-xs text-muted-foreground">
                            {mealItems.reduce((s: number, i: any) => s + (i.calories || 0), 0)} سعرة
                          </span>
                        </div>
                        <div className="p-3 space-y-1">
                          {mealItems.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1">
                              <span className="text-foreground">{item.food_name} {item.quantity && <span className="text-muted-foreground text-xs">({item.quantity})</span>}</span>
                              <span className="text-xs text-muted-foreground">{item.calories} سعرة</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {plan.notes && (
                      <div className="bg-card rounded-xl border border-border p-3 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{plan.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Food Logging Sheet */}
        <Sheet open={showLogSheet} onOpenChange={setShowLogSheet}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                تسجيل {selectedMeal}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 mt-4">
              {!selectedFood && !isCustom && (
                <>
                  <FoodSearch
                    onSelect={handleFoodSelect}
                    onCustomAdd={() => setIsCustom(true)}
                    placeholder="ابحث عن طعام..."
                  />

                  {/* Frequently logged — placeholder for now */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">من خطتك الغذائية</p>
                    {mealPlans?.flatMap((p: any) => p.items || [])
                      .filter((i: any) => i.meal_name === selectedMeal)
                      .slice(0, 5)
                      .map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            logFood.mutate({
                              meal_type: selectedMeal,
                              food_name_ar: item.food_name,
                              quantity_grams: 100,
                              calories: item.calories,
                              protein: item.protein,
                              carbs: item.carbs,
                              fat: item.fats || item.fat || 0,
                            });
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-2"
                        >
                          <span className="text-sm text-foreground">{item.food_name}</span>
                          <span className="text-xs text-muted-foreground">{item.calories} سعرة</span>
                        </button>
                      ))}
                  </div>
                </>
              )}

              {selectedFood && !isCustom && (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-foreground">{selectedFood.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{selectedFood.name_en}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-foreground">الكمية (جرام)</label>
                      <span className="text-sm font-bold text-primary">{logQuantity}g</span>
                    </div>
                    <Slider value={[logQuantity]} onValueChange={v => setLogQuantity(v[0])} min={10} max={500} step={10} />
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "سعرات", val: Math.round(selectedFood.calories_per_100g * logQuantity / 100), color: "text-primary" },
                      { label: "بروتين", val: Math.round(selectedFood.protein_per_100g * logQuantity / 100), color: "text-blue-400" },
                      { label: "كارب", val: Math.round(selectedFood.carbs_per_100g * logQuantity / 100), color: "text-amber-400" },
                      { label: "دهون", val: Math.round(selectedFood.fat_per_100g * logQuantity / 100), color: "text-rose-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-card rounded-lg border border-border p-2">
                        <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedFood(null)}>رجوع</Button>
                    <Button className="flex-1" onClick={handleConfirmLog} disabled={logFood.isPending}>
                      {logFood.isPending ? "جاري التسجيل..." : "تأكيد"}
                    </Button>
                  </div>
                </div>
              )}

              {isCustom && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-foreground">أضف طعام جديد</p>
                  <Input placeholder="اسم الطعام" value={customFood.name} onChange={e => setCustomFood(p => ({ ...p, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">سعرات</label>
                      <Input type="number" value={customFood.calories || ""} onChange={e => setCustomFood(p => ({ ...p, calories: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">بروتين</label>
                      <Input type="number" value={customFood.protein || ""} onChange={e => setCustomFood(p => ({ ...p, protein: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">كارب</label>
                      <Input type="number" value={customFood.carbs || ""} onChange={e => setCustomFood(p => ({ ...p, carbs: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">دهون</label>
                      <Input type="number" value={customFood.fat || ""} onChange={e => setCustomFood(p => ({ ...p, fat: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">الكمية (جرام)</label>
                    <Input type="number" value={logQuantity} onChange={e => setLogQuantity(Number(e.target.value))} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsCustom(false)}>رجوع</Button>
                    <Button className="flex-1" onClick={handleConfirmLog} disabled={logFood.isPending || !customFood.name.trim()}>
                      {logFood.isPending ? "جاري التسجيل..." : "تسجيل"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalNutrition;
