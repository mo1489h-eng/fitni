import { useState, useEffect, useMemo } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, UtensilsCrossed, ChevronDown, ChevronUp, UserCircle, Copy, Target, Search, Flame, Beef, Wheat, Droplets, Settings2, TrendingUp, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import FoodSearch, { FoodItem } from "@/components/nutrition/FoodSearch";
import MacroRing from "@/components/nutrition/MacroRing";
import NutritionDayChart from "@/components/nutrition/NutritionDayChart";

interface Client { id: string; name: string; }
interface MealItem {
  id?: string; meal_name: string; food_name: string; calories: number;
  protein: number; carbs: number; fats: number; quantity: string; item_order: number;
}
interface MealPlan {
  id: string; name: string; notes: string; client_id: string | null;
  created_at: string; client?: Client; items?: MealItem[];
}

const MEAL_TYPES = ["فطور", "غداء", "عشاء", "سناك"];

const emptyItem = (order: number, mealName = "فطور"): MealItem => ({
  meal_name: mealName, food_name: "", calories: 0, protein: 0, carbs: 0, fats: 0, quantity: "", item_order: order,
});

const Nutrition = () => {
  usePageTitle("التغذية");
  const { user } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyPlanId, setCopyPlanId] = useState<string | null>(null);
  const [selectedCopyClients, setSelectedCopyClients] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);

  // Targets sheet
  const [showTargets, setShowTargets] = useState(false);
  const [targetClient, setTargetClient] = useState<string>("");
  const [targetCalories, setTargetCalories] = useState(2000);
  const [targetProtein, setTargetProtein] = useState(150);
  const [targetCarbs, setTargetCarbs] = useState(200);
  const [targetFat, setTargetFat] = useState(65);
  const [savingTargets, setSavingTargets] = useState(false);

  // Client nutrition dashboard
  const [selectedDashClient, setSelectedDashClient] = useState<string>("");
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [clientWeekly, setClientWeekly] = useState<any[]>([]);
  const [clientTargets, setClientTargets] = useState<any>(null);
  const [dashTab, setDashTab] = useState("plans");

  // Form state
  const [planName, setPlanName] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [items, setItems] = useState<MealItem[]>([emptyItem(0)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) { fetchPlans(); fetchClients(); } }, [user]);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").eq("trainer_id", user!.id).order("name");
    if (data) setClients(data);
  };

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from("meal_plans").select("*").eq("trainer_id", user!.id).order("created_at", { ascending: false });
    if (data) {
      const enriched = await Promise.all(data.map(async (plan: any) => {
        let client: Client | undefined;
        if (plan.client_id) {
          const { data: c } = await supabase.from("clients").select("id, name").eq("id", plan.client_id).maybeSingle();
          if (c) client = c;
        }
        const { data: planItems } = await supabase.from("meal_items").select("*").eq("meal_plan_id", plan.id).order("item_order");
        return { ...plan, client, items: planItems || [] };
      }));
      setPlans(enriched);
    }
    setLoading(false);
  };

  // Fetch client nutrition data
  useEffect(() => {
    if (!selectedDashClient || !user) return;
    const fetchClientData = async () => {
      const [logsRes, targetsRes] = await Promise.all([
        supabase.from("nutrition_logs" as any).select("*").eq("client_id", selectedDashClient).gte("logged_date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).order("created_at", { ascending: false }),
        supabase.from("nutrition_targets" as any).select("*").eq("client_id", selectedDashClient).maybeSingle(),
      ]);
      setClientLogs((logsRes.data || []) as any[]);
      setClientTargets(targetsRes.data as any);

      // Build weekly data
      const weekData: Record<string, any> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        weekData[d] = { day: d, calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      (logsRes.data || []).forEach((log: any) => {
        if (weekData[log.logged_date]) {
          weekData[log.logged_date].calories += Number(log.calories) || 0;
          weekData[log.logged_date].protein += Number(log.protein) || 0;
          weekData[log.logged_date].carbs += Number(log.carbs) || 0;
          weekData[log.logged_date].fat += Number(log.fat) || 0;
        }
      });
      setClientWeekly(Object.values(weekData));
    };
    fetchClientData();
  }, [selectedDashClient, user]);

  const openNewPlan = () => {
    setEditingPlan(null); setPlanName(""); setPlanNotes(""); setSelectedClient("");
    setItems([emptyItem(0)]); setShowDialog(true);
  };

  const openEditPlan = (plan: MealPlan) => {
    setEditingPlan(plan); setPlanName(plan.name); setPlanNotes(plan.notes || "");
    setSelectedClient(plan.client_id || "");
    setItems(plan.items && plan.items.length > 0 ? plan.items : [emptyItem(0)]);
    setShowDialog(true);
  };

  const handleFoodSelect = (food: FoodItem, mealName: string) => {
    const qty = food.serving_size_default || 100;
    const factor = qty / 100;
    const newItem: MealItem = {
      meal_name: mealName,
      food_name: food.name_ar,
      calories: Math.round(food.calories_per_100g * factor),
      protein: Math.round(food.protein_per_100g * factor),
      carbs: Math.round(food.carbs_per_100g * factor),
      fats: Math.round(food.fat_per_100g * factor),
      quantity: `${qty}${food.serving_unit}`,
      item_order: items.length,
    };
    setItems(prev => [...prev.filter(i => i.food_name.trim()), newItem]);
  };

  const addItem = (mealName = "فطور") => setItems([...items, emptyItem(items.length, mealName)]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof MealItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSave = async () => {
    if (!planName.trim()) { toast({ title: "أدخل اسم الخطة", variant: "destructive" }); return; }
    if (!items.some(i => i.food_name.trim())) { toast({ title: "أضف وجبة واحدة على الأقل", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let planId: string;
      if (editingPlan) {
        await supabase.from("meal_plans").update({ name: planName, notes: planNotes, client_id: selectedClient || null }).eq("id", editingPlan.id);
        planId = editingPlan.id;
        await supabase.from("meal_items").delete().eq("meal_plan_id", planId);
      } else {
        const { data, error } = await supabase.from("meal_plans").insert({ trainer_id: user!.id, name: planName, notes: planNotes, client_id: selectedClient || null }).select("id").single();
        if (error) throw error;
        planId = data.id;
      }
      const validItems = items.filter(i => i.food_name.trim());
      if (validItems.length > 0) {
        await supabase.from("meal_items").insert(validItems.map((item, idx) => ({
          meal_plan_id: planId, meal_name: item.meal_name.slice(0, 200),
          food_name: item.food_name.trim().slice(0, 200),
          calories: Math.max(0, Number(item.calories) || 0), protein: Math.max(0, Number(item.protein) || 0),
          carbs: Math.max(0, Number(item.carbs) || 0), fats: Math.max(0, Number(item.fats) || 0),
          quantity: item.quantity, item_order: idx,
        })));
      }
      toast({ title: editingPlan ? "تم تحديث الخطة" : "تم إنشاء الخطة بنجاح" });
      setShowDialog(false);
      fetchPlans();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase.from("meal_plans").delete().eq("id", planId);
    if (!error) { toast({ title: "تم حذف الخطة" }); fetchPlans(); }
  };

  const openCopyDialog = (planId: string) => { setCopyPlanId(planId); setSelectedCopyClients([]); setShowCopyDialog(true); };
  const toggleCopyClient = (clientId: string) => {
    setSelectedCopyClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  };

  const handleCopyPlan = async () => {
    if (!copyPlanId || selectedCopyClients.length === 0) return;
    setCopying(true);
    try {
      const plan = plans.find(p => p.id === copyPlanId);
      if (!plan) return;
      for (const clientId of selectedCopyClients) {
        const { data: newPlan, error } = await supabase.from("meal_plans").insert({ trainer_id: user!.id, name: plan.name, notes: plan.notes, client_id: clientId }).select("id").single();
        if (error) throw error;
        if (plan.items && plan.items.length > 0) {
          await supabase.from("meal_items").insert(plan.items.map((item, idx) => ({
            meal_plan_id: newPlan.id, meal_name: item.meal_name, food_name: item.food_name,
            calories: item.calories, protein: item.protein, carbs: item.carbs, fats: item.fats, quantity: item.quantity, item_order: idx,
          })));
        }
      }
      toast({ title: `تم نسخ الخطة لـ ${selectedCopyClients.length} عميل` });
      setShowCopyDialog(false); fetchPlans();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally { setCopying(false); }
  };

  const handleSaveTargets = async () => {
    if (!targetClient) { toast({ title: "اختر عميل", variant: "destructive" }); return; }
    setSavingTargets(true);
    try {
      const { error } = await supabase.from("nutrition_targets" as any).upsert({
        client_id: targetClient, calories_target: targetCalories, protein_target: targetProtein,
        carbs_target: targetCarbs, fat_target: targetFat, set_by_trainer: true, updated_at: new Date().toISOString(),
      } as any, { onConflict: "client_id" });
      if (error) throw error;
      toast({ title: "تم حفظ الأهداف" });
      setShowTargets(false);
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally { setSavingTargets(false); }
  };

  const totalMacros = (planItems: MealItem[]) =>
    planItems.reduce((acc, i) => ({ calories: acc.calories + (i.calories || 0), protein: acc.protein + (i.protein || 0), carbs: acc.carbs + (i.carbs || 0), fats: acc.fats + (i.fats || 0) }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const groupByMeal = (planItems: MealItem[]) => {
    const groups: Record<string, MealItem[]> = {};
    planItems.forEach(item => { if (!groups[item.meal_name]) groups[item.meal_name] = []; groups[item.meal_name].push(item); });
    return groups;
  };

  // Today's data for selected dashboard client
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = clientLogs.filter(l => l.logged_date === todayStr);
  const todayTotals = todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (Number(l.calories) || 0),
    protein: acc.protein + (Number(l.protein) || 0),
    carbs: acc.carbs + (Number(l.carbs) || 0),
    fat: acc.fat + (Number(l.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const daysLogged = clientWeekly.filter(d => d.calories > 0).length;

  return (
    <TrainerLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
              التغذية
            </h1>
            <p className="text-muted-foreground text-sm">أدِر خطط التغذية وتابع أداء العملاء</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTargets(true)} className="gap-2">
              <Target className="w-4 h-4" /> أهداف التغذية
            </Button>
            <Button onClick={openNewPlan} className="gap-2">
              <Plus className="w-4 h-4" /> خطة جديدة
            </Button>
          </div>
        </div>

        {/* Tabs: Plans / Client Dashboard */}
        <Tabs value={dashTab} onValueChange={setDashTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="plans" className="gap-2"><UtensilsCrossed className="w-4 h-4" />الخطط الغذائية</TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="w-4 h-4" />لوحة العميل</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
            ) : plans.length === 0 ? (
              <Card className="p-12 text-center">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد خطط غذائية بعد</h3>
                <p className="text-muted-foreground text-sm mb-4">ابدأ بإنشاء أول خطة غذائية لعملائك</p>
                <Button onClick={openNewPlan} variant="outline" className="gap-2"><Plus className="w-4 h-4" />إنشاء خطة</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => {
                  const totals = totalMacros(plan.items || []);
                  const isExpanded = expandedPlan === plan.id;
                  return (
                    <Card key={plan.id} className="overflow-hidden">
                      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <UtensilsCrossed className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{plan.name}</h3>
                              {plan.client && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UserCircle className="w-3 h-3" />{plan.client.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">{totals.calories} سعرة</Badge>
                            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">P:{totals.protein}g</Badge>
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">C:{totals.carbs}g</Badge>
                            <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-400">F:{totals.fats}g</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openCopyDialog(plan.id); }} title="نسخ"><Copy className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openEditPlan(plan); }}><Settings2 className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); deletePlan(plan.id); }}><Trash2 className="w-4 h-4" /></Button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {isExpanded && plan.items && plan.items.length > 0 && (
                        <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-3">
                          {Object.entries(groupByMeal(plan.items)).map(([mealName, mealItems]) => {
                            const mealTotal = totalMacros(mealItems);
                            return (
                              <div key={mealName}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="text-sm font-bold text-primary">{mealName}</h4>
                                  <span className="text-xs text-muted-foreground">{mealTotal.calories} سعرة</span>
                                </div>
                                {mealItems.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                                    <span className="text-foreground">{item.food_name} {item.quantity && <span className="text-muted-foreground text-xs">({item.quantity})</span>}</span>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <span>{item.calories} سعرة</span>
                                      <span className="text-blue-400">P:{item.protein}</span>
                                      <span className="text-amber-400">C:{item.carbs}</span>
                                      <span className="text-rose-400">F:{item.fats}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {plan.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">{plan.notes}</p>}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Client Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <Select value={selectedDashClient} onValueChange={setSelectedDashClient}>
              <SelectTrigger><SelectValue placeholder="اختر عميل لعرض بياناته" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {selectedDashClient && (
              <div className="space-y-4">
                {/* Today Summary */}
                <Card className="p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" /> اليوم
                  </h3>
                  <div className="grid grid-cols-4 gap-4 justify-items-center">
                    <MacroRing value={todayTotals.calories} target={clientTargets?.calories_target || 2000} color="hsl(142 76% 36%)" label="سعرات" size={72} />
                    <MacroRing value={todayTotals.protein} target={clientTargets?.protein_target || 150} color="hsl(220 70% 55%)" label="بروتين" size={72} />
                    <MacroRing value={todayTotals.carbs} target={clientTargets?.carbs_target || 200} color="hsl(35 90% 55%)" label="كارب" size={72} />
                    <MacroRing value={todayTotals.fat} target={clientTargets?.fat_target || 65} color="hsl(340 70% 55%)" label="دهون" size={72} />
                  </div>
                </Card>

                {/* Plan Compliance */}
                {(() => {
                  const clientPlan = plans.find(p => p.client_id === selectedDashClient);
                  if (!clientPlan || !clientPlan.items?.length) return null;

                  const planItems = clientPlan.items || [];
                  let logged = 0, modified = 0, missed = 0;

                  const complianceItems = planItems.map((item: MealItem) => {
                    const exactMatch = todayLogs.find((l: any) =>
                      l.meal_type === item.meal_name &&
                      l.food_name_ar === item.food_name &&
                      Math.abs(Number(l.quantity_grams) - (parseInt(item.quantity || "100") || 100)) < 5
                    );
                    const modifiedMatch = todayLogs.find((l: any) =>
                      l.meal_type === item.meal_name &&
                      l.food_name_ar === item.food_name &&
                      Math.abs(Number(l.quantity_grams) - (parseInt(item.quantity || "100") || 100)) >= 5
                    );

                    if (exactMatch) { logged++; return { ...item, status: "logged" as const, log: exactMatch }; }
                    if (modifiedMatch) { modified++; return { ...item, status: "modified" as const, log: modifiedMatch }; }
                    missed++;
                    return { ...item, status: "missed" as const, log: null };
                  });

                  const total = planItems.length;
                  const complianceScore = total > 0 ? Math.round((logged / total) * 100) : 0;

                  return (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" /> التزام الخطة
                        </h3>
                        <Badge variant={complianceScore >= 80 ? "default" : complianceScore >= 50 ? "secondary" : "destructive"}>
                          {complianceScore}% التزام بالخطة اليوم
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground">كما مخطط ({logged})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                          <span className="text-muted-foreground">معدّل ({modified})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                          <span className="text-muted-foreground">لم يأكل ({missed})</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {MEAL_TYPES.map(mt => {
                          const mealItems = complianceItems.filter(i => i.meal_name === mt);
                          if (mealItems.length === 0) return null;
                          return (
                            <div key={mt}>
                              <p className="text-xs font-semibold text-primary mb-1 mt-2">{mt}</p>
                              {mealItems.map((item, idx) => (
                                <div key={idx} className={`flex items-center justify-between py-2 px-2 rounded-lg mb-1 ${
                                  item.status === "logged" ? "bg-primary/5 border border-primary/20" :
                                  item.status === "modified" ? "bg-yellow-500/5 border border-yellow-500/20" :
                                  "bg-muted/30 border border-border"
                                }`}>
                                  <div className="flex items-center gap-2 flex-1">
                                    {item.status === "logged" && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                                    {item.status === "modified" && <Pencil className="w-4 h-4 text-yellow-500 shrink-0" />}
                                    {item.status === "missed" && <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                                    <div>
                                      <p className="text-sm text-foreground">{item.food_name}</p>
                                      {item.status === "modified" && item.log && (
                                        <p className="text-xs text-yellow-500">
                                          {item.quantity || "100g"} → {item.log.quantity_grams}g ({item.log.calories} سعرة)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] ${
                                    item.status === "logged" ? "border-primary/30 text-primary" :
                                    item.status === "modified" ? "border-yellow-500/30 text-yellow-500" :
                                    "border-border text-muted-foreground"
                                  }`}>
                                    {item.status === "logged" ? "كما مخطط" : item.status === "modified" ? "معدّل" : "لم يأكل"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })()}

                {/* Today's extra meals (not in plan) */}
                {todayLogs.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">ما أكله اليوم</h3>
                    <div className="space-y-2">
                      {MEAL_TYPES.map(mt => {
                        const mtLogs = todayLogs.filter((l: any) => l.meal_type === mt);
                        if (mtLogs.length === 0) return null;
                        return (
                          <div key={mt}>
                            <p className="text-xs font-semibold text-primary mb-1">{mt}</p>
                            {mtLogs.map((l: any) => (
                              <div key={l.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                                <span className="text-foreground">{l.food_name_ar} <span className="text-muted-foreground text-xs">({l.quantity_grams}g)</span></span>
                                <span className="text-muted-foreground text-xs">{l.calories} سعرة</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Weekly chart */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" /> آخر 7 أيام
                    </h3>
                    <Badge variant="secondary">{daysLogged}/7 أيام مسجلة</Badge>
                  </div>
                  <NutritionDayChart data={clientWeekly} target={clientTargets?.calories_target} />
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              {editingPlan ? "تعديل الخطة الغذائية" : "خطة غذائية جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">اسم الخطة</label>
                <Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="مثال: خطة تنشيف" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">تعيين لعميل</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="اختر عميل (اختياري)" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Food Search per meal */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">أضف أطعمة من قاعدة البيانات</h3>
              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map(mt => (
                  <div key={mt}>
                    <label className="text-xs text-muted-foreground mb-1 block">{mt}</label>
                    <FoodSearch
                      onSelect={food => handleFoodSelect(food, mt)}
                      placeholder={`ابحث لـ ${mt}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} placeholder="ملاحظات..." rows={2} />

            {/* Items list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">الوجبات ({items.filter(i => i.food_name.trim()).length})</h3>
                <Button size="sm" variant="outline" onClick={() => addItem()} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> يدوي
                </Button>
              </div>
              {items.map((item, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Select value={item.meal_name} onValueChange={v => updateItem(index, "meal_name", v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="اسم الطعام" value={item.food_name} onChange={e => updateItem(index, "food_name", e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="الكمية" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: "calories", label: "سعرات" },
                      { key: "protein", label: "بروتين" },
                      { key: "carbs", label: "كارب" },
                      { key: "fats", label: "دهون" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] text-muted-foreground">{f.label}</label>
                        <Input type="number" value={(item as any)[f.key] || ""} onChange={e => updateItem(index, f.key as keyof MealItem, Number(e.target.value))} className="h-8 text-xs" />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Totals */}
            {items.some(i => i.food_name.trim()) && (
              <Card className="p-3 bg-primary/5 border-primary/20">
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div><div className="font-bold text-foreground">{items.reduce((s, i) => s + (i.calories || 0), 0)}</div><div className="text-[10px] text-muted-foreground">سعرة</div></div>
                  <div><div className="font-bold text-blue-400">{items.reduce((s, i) => s + (i.protein || 0), 0)}g</div><div className="text-[10px] text-muted-foreground">بروتين</div></div>
                  <div><div className="font-bold text-amber-400">{items.reduce((s, i) => s + (i.carbs || 0), 0)}g</div><div className="text-[10px] text-muted-foreground">كارب</div></div>
                  <div><div className="font-bold text-rose-400">{items.reduce((s, i) => s + (i.fats || 0), 0)}g</div><div className="text-[10px] text-muted-foreground">دهون</div></div>
                </div>
              </Card>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "جاري الحفظ..." : editingPlan ? "تحديث الخطة" : "حفظ الخطة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>نسخ الخطة للعملاء</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clients.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selectedCopyClients.includes(c.id)} onCheckedChange={() => toggleCopyClient(c.id)} />
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </label>
            ))}
          </div>
          <Button className="w-full mt-3" disabled={selectedCopyClients.length === 0 || copying} onClick={handleCopyPlan}>
            {copying ? "جاري النسخ..." : `نسخ لـ ${selectedCopyClients.length} عميل`}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Targets Sheet */}
      <Sheet open={showTargets} onOpenChange={setShowTargets}>
        <SheetContent side="right" className="w-full sm:max-w-md" dir="rtl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              أهداف التغذية اليومية
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">اختر العميل</label>
              <Select value={targetClient} onValueChange={setTargetClient}>
                <SelectTrigger><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              {[
                { label: "السعرات اليومية", val: targetCalories, set: setTargetCalories, min: 800, max: 5000, step: 50, unit: "سعرة", color: "text-primary" },
                { label: "البروتين", val: targetProtein, set: setTargetProtein, min: 30, max: 400, step: 5, unit: "g", color: "text-blue-400" },
                { label: "الكربوهيدرات", val: targetCarbs, set: setTargetCarbs, min: 30, max: 600, step: 5, unit: "g", color: "text-amber-400" },
                { label: "الدهون", val: targetFat, set: setTargetFat, min: 10, max: 200, step: 5, unit: "g", color: "text-rose-400" },
              ].map(t => (
                <div key={t.label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-foreground">{t.label}</label>
                    <span className={`text-sm font-bold ${t.color}`}>{t.val} {t.unit}</span>
                  </div>
                  <Slider value={[t.val]} onValueChange={v => t.set(v[0])} min={t.min} max={t.max} step={t.step} />
                </div>
              ))}
            </div>
            <Button className="w-full" disabled={savingTargets || !targetClient} onClick={handleSaveTargets}>
              {savingTargets ? "جاري الحفظ..." : "حفظ الأهداف"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TrainerLayout>
  );
};

export default Nutrition;
