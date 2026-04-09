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
  BarChart3, Calendar as CalendarIcon, Pencil, Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MacroRing from "@/components/nutrition/MacroRing";
import NutritionDayChart from "@/components/nutrition/NutritionDayChart";
import FoodSearch, { FoodItem } from "@/components/nutrition/FoodSearch";

const MEAL_TYPES = ["فطور", "غداء", "عشاء", "سناك"] as const;
const MEAL_ICONS: Record<string, typeof Flame> = {
  "فطور": Flame, "غداء": UtensilsCrossed, "عشاء": UtensilsCrossed, "سناك": Beef,
};

// Normalize trainer meal names to portal meal types
const normalizeMealName = (name: string): string => {
  const n = name.trim();
  if (/فطور|الفطور|إفطار|الإفطار/i.test(n)) return "فطور";
  if (/غداء|الغداء/i.test(n)) return "غداء";
  if (/عشاء|العشاء/i.test(n)) return "عشاء";
  if (/سناك|وجبة خفيفة|خفيفة|snack/i.test(n)) return "سناك";
  // Fallback: try partial match
  for (const mt of MEAL_TYPES) {
    if (n.includes(mt)) return mt;
  }
  return "سناك"; // default to snack for unrecognized
};

const PortalNutrition = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("plan");
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string>("فطور");
  const [logQuantity, setLogQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [customFood, setCustomFood] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isCustom, setIsCustom] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(() => Number(sessionStorage.getItem("water_today") || 0));

  // Modify sheet state
  const [showModifySheet, setShowModifySheet] = useState(false);
  const [modifyingItem, setModifyingItem] = useState<any>(null);
  const [modifyQuantity, setModifyQuantity] = useState(100);
  const [modifyMode, setModifyMode] = useState<"quantity" | "replace">("quantity");
  const [replaceFood, setReplaceFood] = useState<FoodItem | null>(null);

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

  // Fetch meal plans
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
      setShowModifySheet(false);
      setSelectedFood(null);
      setReplaceFood(null);
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

  // Build plan items grouped by meal, with log status
  const planItemsByMeal = useMemo(() => {
    const result: Record<string, any[]> = {};
    MEAL_TYPES.forEach(m => { result[m] = []; });

    if (mealPlans && mealPlans.length > 0) {
      const plan = mealPlans[0];
      (plan.items || []).forEach((item: any) => {
        const normalizedMeal = normalizeMealName(item.meal_name);
        // Check log status by matching food name in logs for that normalized meal
        const mealLogs = logs.filter((l: any) => l.meal_type === normalizedMeal);
        const exactLog = mealLogs.find((l: any) =>
          l.food_name_ar === item.food_name &&
          Math.abs(Number(l.quantity_grams) - (parseInt(item.quantity) || 100)) < 10
        );
        const modifiedLog = !exactLog ? mealLogs.find((l: any) =>
          l.food_name_ar === item.food_name
        ) : null;

        result[normalizedMeal].push({
          ...item,
          meal_name_normalized: normalizedMeal,
          logStatus: exactLog ? "logged" : modifiedLog ? "modified" : "pending",
          loggedData: exactLog || modifiedLog || null,
        });
      });
    }
    return result;
  }, [mealPlans, logs]);

  const hasPlan = mealPlans && mealPlans.length > 0 && mealPlans[0].items?.length > 0;

  // Log plan item exactly as planned
  const logAsPlanned = (item: any) => {
    logFood.mutate({
      meal_type: item.meal_name_normalized || normalizeMealName(item.meal_name),
      food_name_ar: item.food_name,
      quantity_grams: parseInt(item.quantity) || 100,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fats || item.fat || 0,
      is_custom: false,
    });
  };

  // Open modify sheet for a plan item
  const openModify = (item: any) => {
    setModifyingItem(item);
    setModifyQuantity(parseInt(item.quantity) || 100);
    setModifyMode("quantity");
    setReplaceFood(null);
    setShowModifySheet(true);
  };

  // Confirm modified log
  const confirmModify = () => {
    if (modifyMode === "replace" && replaceFood) {
      const factor = modifyQuantity / 100;
      logFood.mutate({
        meal_type: modifyingItem.meal_name,
        food_name_ar: replaceFood.name_ar,
        food_name_en: replaceFood.name_en,
        food_id: replaceFood.id,
        quantity_grams: modifyQuantity,
        calories: Math.round(replaceFood.calories_per_100g * factor),
        protein: Math.round(replaceFood.protein_per_100g * factor),
        carbs: Math.round(replaceFood.carbs_per_100g * factor),
        fat: Math.round(replaceFood.fat_per_100g * factor),
      });
    } else if (modifyingItem) {
      const origQty = parseInt(modifyingItem.quantity) || 100;
      const factor = modifyQuantity / origQty;
      logFood.mutate({
        meal_type: modifyingItem.meal_name,
        food_name_ar: modifyingItem.food_name,
        quantity_grams: modifyQuantity,
        calories: Math.round((modifyingItem.calories || 0) * factor),
        protein: Math.round((modifyingItem.protein || 0) * factor),
        carbs: Math.round((modifyingItem.carbs || 0) * factor),
        fat: Math.round((modifyingItem.fats || modifyingItem.fat || 0) * factor),
      });
    }
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

  // Extra logged items (not from plan) for each meal
  const extraLogsByMeal = useMemo(() => {
    const result: Record<string, any[]> = {};
    MEAL_TYPES.forEach(m => {
      const planFoodNames = (planItemsByMeal[m] || []).map((i: any) => i.food_name);
      result[m] = logs.filter((l: any) =>
        l.meal_type === m && !planFoodNames.includes(l.food_name_ar)
      );
    });
    return result;
  }, [logs, planItemsByMeal]);

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

        {/* Hero Calorie Ring - Always visible */}
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

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 bg-card border border-border">
            <TabsTrigger value="plan" className="text-xs gap-1"><FileText className="w-3 h-3" />الخطة</TabsTrigger>
            <TabsTrigger value="today" className="text-xs gap-1"><CalendarIcon className="w-3 h-3" />اليوم</TabsTrigger>
            <TabsTrigger value="week" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />أسبوعي</TabsTrigger>
          </TabsList>

          {/* PLAN TAB - Default & Primary */}
          <TabsContent value="plan" className="space-y-3 mt-3">
            {!hasPlan ? (
              <div className="bg-card rounded-xl border border-border p-10 text-center">
                <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد خطة غذائية من المدرب</p>
                <p className="text-xs text-muted-foreground mt-1">يمكنك تسجيل وجباتك يدوياً من تبويب "اليوم"</p>
              </div>
            ) : (
              MEAL_TYPES.map(meal => {
                const planItems = planItemsByMeal[meal] || [];
                const extraLogs = extraLogsByMeal[meal] || [];
                const mealLogs = logs.filter((l: any) => l.meal_type === meal);
                const mealCals = mealLogs.reduce((s: number, l: any) => s + (Number(l.calories) || 0), 0);
                const plannedCals = planItems.reduce((s: number, i: any) => s + (Number(i.calories) || 0), 0);
                const MealIcon = MEAL_ICONS[meal] || UtensilsCrossed;

                if (planItems.length === 0 && extraLogs.length === 0) return null;

                return (
                  <div key={meal} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* Meal Header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                      <div className="flex items-center gap-2">
                        <MealIcon className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-sm text-foreground">{meal}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{mealCals} / {plannedCals} سعرة</span>
                      </div>
                    </div>

                    {/* Plan Items */}
                    <div className="p-3 space-y-1">
                      {planItems.map((item: any) => {
                        // Check if this item was logged
                        const isLogged = mealLogs.some((l: any) =>
                          l.food_name_ar === item.food_name &&
                          Math.abs(Number(l.quantity_grams) - (parseInt(item.quantity) || 100)) < 5
                        );
                        const isModified = mealLogs.some((l: any) =>
                          l.food_name_ar === item.food_name &&
                          Math.abs(Number(l.quantity_grams) - (parseInt(item.quantity) || 100)) >= 5
                        );
                        const matchedLog = mealLogs.find((l: any) => l.food_name_ar === item.food_name);

                        const status = isLogged ? "logged" : isModified ? "modified" : "pending";

                        return (
                          <div key={item.id}
                            className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${
                              status === "logged" ? "bg-primary/5 border border-primary/20" :
                              status === "modified" ? "bg-yellow-500/5 border border-yellow-500/20" :
                              "border border-transparent"
                            }`}
                          >
                            {/* Status Icon */}
                            <div className="shrink-0">
                              {status === "logged" ? (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              ) : status === "modified" ? (
                                <Pencil className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Food Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.food_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.quantity || "100g"}</span>
                                <span>{item.calories} سعرة</span>
                              </div>
                              {status === "modified" && matchedLog && (
                                <p className="text-xs text-yellow-500 mt-0.5">
                                  تم التعديل: {matchedLog.quantity_grams}g - {matchedLog.calories} سعرة
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            {status === "pending" && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                                  onClick={() => logAsPlanned(item)}
                                  disabled={logFood.isPending}
                                >
                                  <Check className="w-3.5 h-3.5" /> اكلته
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 gap-1"
                                  onClick={() => openModify(item)}
                                >
                                  <Pencil className="w-3.5 h-3.5" /> عدّل
                                </Button>
                              </div>
                            )}
                            {status !== "pending" && matchedLog && (
                              <button onClick={() => deleteLog.mutate(matchedLog.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Extra logged items (not from plan) */}
                      {extraLogs.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg bg-primary/5 border border-primary/20">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{l.food_name_ar}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{l.quantity_grams}g</span>
                              <span>{l.calories} سعرة</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">اضافة خارج الخطة</p>
                          </div>
                          <button onClick={() => deleteLog.mutate(l.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add extra food button */}
                    <div className="px-3 pb-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-8 text-xs text-muted-foreground hover:text-primary gap-1 border border-dashed border-border"
                        onClick={() => openLogSheet(meal)}
                      >
                        <Plus className="w-3.5 h-3.5" /> اضف صنف آخر
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* TODAY TAB */}
          <TabsContent value="today" className="space-y-4 mt-3">
            {/* Water */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-foreground">شرب الماء</span>
                </div>
                <span className="text-xs text-muted-foreground">{waterGlasses} / 8 اكواب</span>
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

            {/* Meal Cards - Free logging */}
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
                  {mealLogs.length > 0 ? (
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
                  ) : (
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
                <TrendingUp className="w-4 h-4 text-primary" /> السعرات — آخر 7 ايام
              </h3>
              <NutritionDayChart data={weekly} target={t.calories_target} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{daysLogged}<span className="text-muted-foreground text-sm">/7</span></p>
                <p className="text-xs text-muted-foreground mt-1">ايام مسجلة</p>
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
        </Tabs>

        {/* Modify Bottom Sheet */}
        <Sheet open={showModifySheet} onOpenChange={setShowModifySheet}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-yellow-500" />
                تعديل {modifyingItem?.food_name}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 mt-4">
              {/* Toggle: change quantity vs replace */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={modifyMode === "quantity" ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => setModifyMode("quantity")}
                >
                  تغيير الكمية
                </Button>
                <Button
                  size="sm"
                  variant={modifyMode === "replace" ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => setModifyMode("replace")}
                >
                  استبدال الصنف
                </Button>
              </div>

              {modifyMode === "quantity" && modifyingItem && (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-foreground">{modifyingItem.food_name}</p>
                    <p className="text-xs text-muted-foreground">الكمية المخططة: {modifyingItem.quantity || "100g"}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-foreground">الكمية الفعلية (جرام)</label>
                      <span className="text-sm font-bold text-yellow-500">{modifyQuantity}g</span>
                    </div>
                    <Slider value={[modifyQuantity]} onValueChange={v => setModifyQuantity(v[0])} min={10} max={500} step={10} />
                  </div>

                  {(() => {
                    const origQty = parseInt(modifyingItem.quantity) || 100;
                    const factor = modifyQuantity / origQty;
                    return (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "سعرات", val: Math.round((modifyingItem.calories || 0) * factor), color: "text-primary" },
                          { label: "بروتين", val: Math.round((modifyingItem.protein || 0) * factor), color: "text-blue-400" },
                          { label: "كارب", val: Math.round((modifyingItem.carbs || 0) * factor), color: "text-amber-400" },
                          { label: "دهون", val: Math.round((modifyingItem.fats || 0) * factor), color: "text-rose-400" },
                        ].map(m => (
                          <div key={m.label} className="bg-card rounded-lg border border-border p-2">
                            <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {modifyMode === "replace" && (
                <div className="space-y-3">
                  {!replaceFood ? (
                    <FoodSearch
                      onSelect={(food) => {
                        setReplaceFood(food);
                        setModifyQuantity(food.serving_size_default || 100);
                      }}
                      placeholder="ابحث عن بديل..."
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-foreground line-through mb-1">{modifyingItem?.food_name}</p>
                        <p className="text-lg font-bold text-foreground">{replaceFood.name_ar}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-foreground">الكمية (جرام)</label>
                          <span className="text-sm font-bold text-yellow-500">{modifyQuantity}g</span>
                        </div>
                        <Slider value={[modifyQuantity]} onValueChange={v => setModifyQuantity(v[0])} min={10} max={500} step={10} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "سعرات", val: Math.round(replaceFood.calories_per_100g * modifyQuantity / 100), color: "text-primary" },
                          { label: "بروتين", val: Math.round(replaceFood.protein_per_100g * modifyQuantity / 100), color: "text-blue-400" },
                          { label: "كارب", val: Math.round(replaceFood.carbs_per_100g * modifyQuantity / 100), color: "text-amber-400" },
                          { label: "دهون", val: Math.round(replaceFood.fat_per_100g * modifyQuantity / 100), color: "text-rose-400" },
                        ].map(m => (
                          <div key={m.label} className="bg-card rounded-lg border border-border p-2">
                            <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setReplaceFood(null)} className="text-xs">تغيير البديل</Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowModifySheet(false)}>الغاء</Button>
                <Button
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={confirmModify}
                  disabled={logFood.isPending || (modifyMode === "replace" && !replaceFood)}
                >
                  {logFood.isPending ? "جاري التسجيل..." : "تاكيد التعديل"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

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
                      {logFood.isPending ? "جاري التسجيل..." : "تاكيد"}
                    </Button>
                  </div>
                </div>
              )}

              {isCustom && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-foreground">اضف طعام جديد</p>
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
