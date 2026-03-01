import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, UtensilsCrossed, Apple, ChevronDown, ChevronUp, UserCircle, Copy } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface MealItem {
  id?: string;
  meal_name: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: string;
  item_order: number;
}

interface MealPlan {
  id: string;
  name: string;
  notes: string;
  client_id: string | null;
  created_at: string;
  client?: Client;
  items?: MealItem[];
}

const MEAL_NAMES = ["فطور", "وجبة خفيفة صباحية", "غداء", "وجبة خفيفة مسائية", "عشاء", "وجبة قبل التمرين", "وجبة بعد التمرين"];

const emptyItem = (order: number, mealName = "فطور"): MealItem => ({
  meal_name: mealName,
  food_name: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  quantity: "",
  item_order: order,
});

const Nutrition = () => {
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

  // Form state
  const [planName, setPlanName] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [items, setItems] = useState<MealItem[]>([emptyItem(0)]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlans();
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .eq("trainer_id", user!.id)
      .order("name");
    if (data) setClients(data);
  };

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("trainer_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch client names and items for each plan
      const enriched = await Promise.all(
        data.map(async (plan: any) => {
          let client: Client | undefined;
          if (plan.client_id) {
            const { data: c } = await supabase
              .from("clients")
              .select("id, name")
              .eq("id", plan.client_id)
              .maybeSingle();
            if (c) client = c;
          }
          const { data: planItems } = await supabase
            .from("meal_items")
            .select("*")
            .eq("meal_plan_id", plan.id)
            .order("item_order");
          return { ...plan, client, items: planItems || [] };
        })
      );
      setPlans(enriched);
    }
    setLoading(false);
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanNotes("");
    setSelectedClient("");
    setItems([emptyItem(0)]);
    setShowDialog(true);
  };

  const openEditPlan = (plan: MealPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanNotes(plan.notes || "");
    setSelectedClient(plan.client_id || "");
    setItems(plan.items && plan.items.length > 0 ? plan.items : [emptyItem(0)]);
    setShowDialog(true);
  };

  const addItem = (mealName = "فطور") => {
    setItems([...items, emptyItem(items.length, mealName)]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof MealItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast({ title: "أدخل اسم الخطة", variant: "destructive" });
      return;
    }
    if (items.length === 0 || !items.some(i => i.food_name.trim())) {
      toast({ title: "أضف وجبة واحدة على الأقل", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let planId: string;

      if (editingPlan) {
        const { error } = await supabase
          .from("meal_plans")
          .update({
            name: planName,
            notes: planNotes,
            client_id: selectedClient || null,
          })
          .eq("id", editingPlan.id);
        if (error) throw error;
        planId = editingPlan.id;

        // Delete old items and re-insert
        await supabase.from("meal_items").delete().eq("meal_plan_id", planId);
      } else {
        const { data, error } = await supabase
          .from("meal_plans")
          .insert({
            trainer_id: user!.id,
            name: planName,
            notes: planNotes,
            client_id: selectedClient || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        planId = data.id;
      }

      // Insert items
      const validItems = items.filter(i => i.food_name.trim());
      if (validItems.length > 0) {
        const { error } = await supabase.from("meal_items").insert(
          validItems.map((item, idx) => ({
            meal_plan_id: planId,
            meal_name: (item.meal_name || "وجبة").slice(0, 200),
            food_name: item.food_name.trim().slice(0, 200),
            calories: Math.max(0, Number(item.calories) || 0),
            protein: Math.max(0, Number(item.protein) || 0),
            carbs: Math.max(0, Number(item.carbs) || 0),
            fats: Math.max(0, Number(item.fats) || 0),
            quantity: item.quantity,
            item_order: idx,
          }))
        );
        if (error) throw error;
      }

      toast({ title: editingPlan ? "تم تحديث الخطة" : "تم إنشاء الخطة بنجاح ✅" });
      setShowDialog(false);
      fetchPlans();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase.from("meal_plans").delete().eq("id", planId);
    if (!error) {
      toast({ title: "تم حذف الخطة" });
      fetchPlans();
    }
  };

  const openCopyDialog = (planId: string) => {
    setCopyPlanId(planId);
    setSelectedCopyClients([]);
    setShowCopyDialog(true);
  };

  const toggleCopyClient = (clientId: string) => {
    setSelectedCopyClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleCopyPlan = async () => {
    if (!copyPlanId || selectedCopyClients.length === 0) return;
    setCopying(true);
    try {
      const plan = plans.find((p) => p.id === copyPlanId);
      if (!plan) return;

      for (const clientId of selectedCopyClients) {
        const { data: newPlan, error } = await supabase
          .from("meal_plans")
          .insert({
            trainer_id: user!.id,
            name: plan.name,
            notes: plan.notes,
            client_id: clientId,
          })
          .select("id")
          .single();
        if (error) throw error;

        if (plan.items && plan.items.length > 0) {
          await supabase.from("meal_items").insert(
            plan.items.map((item, idx) => ({
              meal_plan_id: newPlan.id,
              meal_name: item.meal_name,
              food_name: item.food_name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
              quantity: item.quantity,
              item_order: idx,
            }))
          );
        }
      }

      toast({ title: `تم نسخ الخطة لـ ${selectedCopyClients.length} عميل ✅` });
      setShowCopyDialog(false);
      fetchPlans();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const totalMacros = (planItems: MealItem[]) => {
    return planItems.reduce(
      (acc, i) => ({
        calories: acc.calories + (i.calories || 0),
        protein: acc.protein + (i.protein || 0),
        carbs: acc.carbs + (i.carbs || 0),
        fats: acc.fats + (i.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  // Group items by meal_name
  const groupByMeal = (planItems: MealItem[]) => {
    const groups: Record<string, MealItem[]> = {};
    planItems.forEach((item) => {
      if (!groups[item.meal_name]) groups[item.meal_name] = [];
      groups[item.meal_name].push(item);
    });
    return groups;
  };

  return (
    <TrainerLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الخطط الغذائية</h1>
            <p className="text-muted-foreground text-sm">أنشئ وخصص خطط غذائية لعملائك</p>
          </div>
          <Button onClick={openNewPlan} className="gap-2">
            <Plus className="w-4 h-4" />
            خطة جديدة
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : plans.length === 0 ? (
          <Card className="p-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد خطط غذائية بعد</h3>
            <p className="text-muted-foreground text-sm mb-4">ابدأ بإنشاء أول خطة غذائية لعملائك</p>
            <Button onClick={openNewPlan} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء خطة
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const totals = totalMacros(plan.items || []);
              const isExpanded = expandedPlan === plan.id;
              return (
                <Card key={plan.id} className="overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Apple className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {plan.client && (
                          <span className="flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            {plan.client.name}
                          </span>
                        )}
                        <span>{totals.calories} سعرة</span>
                        <span>بروتين {totals.protein}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openCopyDialog(plan.id); }}
                        title="نسخ للعملاء"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); openEditPlan(plan); }}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && plan.items && plan.items.length > 0 && (
                    <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-3">
                      {Object.entries(groupByMeal(plan.items)).map(([mealName, mealItems]) => (
                        <div key={mealName}>
                          <h4 className="text-sm font-semibold text-primary mb-1">{mealName}</h4>
                          {mealItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                              <span className="text-foreground">{item.food_name} {item.quantity && `(${item.quantity})`}</span>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>{item.calories} سعرة</span>
                                <span>P:{item.protein}</span>
                                <span>C:{item.carbs}</span>
                                <span>F:{item.fats}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {plan.notes && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">📝 {plan.notes}</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "تعديل الخطة الغذائية" : "خطة غذائية جديدة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">اسم الخطة</label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="مثال: خطة تنشيف" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">تعيين لعميل</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر عميل (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">ملاحظات</label>
              <Textarea value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} placeholder="تعليمات إضافية..." rows={2} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">الوجبات</h3>
              </div>

              {items.map((item, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Select value={item.meal_name} onValueChange={(v) => updateItem(index, "meal_name", v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_NAMES.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="اسم الطعام"
                      value={item.food_name}
                      onChange={(e) => updateItem(index, "food_name", e.target.value)}
                    />
                    <Input
                      placeholder="الكمية (مثال: 200g)"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">سعرات</label>
                      <Input
                        type="number"
                        value={item.calories || ""}
                        onChange={(e) => updateItem(index, "calories", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">بروتين</label>
                      <Input
                        type="number"
                        value={item.protein || ""}
                        onChange={(e) => updateItem(index, "protein", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">كربوهيدرات</label>
                      <Input
                        type="number"
                        value={item.carbs || ""}
                        onChange={(e) => updateItem(index, "carbs", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">دهون</label>
                      <Input
                        type="number"
                        value={item.fats || ""}
                        onChange={(e) => updateItem(index, "fats", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <Button variant="outline" className="w-full gap-2" onClick={() => addItem()}>
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </Button>
            </div>

            {/* Totals */}
            {items.some(i => i.food_name.trim()) && (
              <Card className="p-3 bg-primary/5 border-primary/20">
                <h4 className="text-sm font-semibold text-foreground mb-2">إجمالي اليوم</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <div className="font-bold text-foreground">{items.reduce((s, i) => s + (i.calories || 0), 0)}</div>
                    <div className="text-xs text-muted-foreground">سعرة</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{items.reduce((s, i) => s + (i.protein || 0), 0)}g</div>
                    <div className="text-xs text-muted-foreground">بروتين</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{items.reduce((s, i) => s + (i.carbs || 0), 0)}g</div>
                    <div className="text-xs text-muted-foreground">كربوهيدرات</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{items.reduce((s, i) => s + (i.fats || 0), 0)}g</div>
                    <div className="text-xs text-muted-foreground">دهون</div>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "جاري الحفظ..." : editingPlan ? "تحديث الخطة" : "حفظ الخطة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Plan Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>نسخ الخطة للعملاء</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">اختر العملاء لنسخ الخطة الغذائية لهم</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clients.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  checked={selectedCopyClients.includes(c.id)}
                  onCheckedChange={() => toggleCopyClient(c.id)}
                />
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </label>
            ))}
          </div>
          <Button
            className="w-full mt-3"
            disabled={selectedCopyClients.length === 0 || copying}
            onClick={handleCopyPlan}
          >
            {copying ? "جاري النسخ..." : `نسخ لـ ${selectedCopyClients.length} عميل`}
          </Button>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  );
};

export default Nutrition;
