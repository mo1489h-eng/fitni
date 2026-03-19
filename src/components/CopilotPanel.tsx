import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  Bot, Loader2, Sparkles, Check, X, Dumbbell, Apple,
  ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Zap,
  Pencil, Plus, Trash2,
} from "lucide-react";

interface CopilotPanelProps {
  clientId: string;
  clientName: string;
}

const progressMessages = [
  "يحلل بيانات العميل...",
  "يختار أفضل التمارين...",
  "يحسب الأوزان المناسبة...",
  "يضيف التقدم الأسبوعي...",
];

const CopilotPanel = ({ clientId, clientName }: CopilotPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasCopilotAccess, getProFeatureBlockReason } = usePlanLimits();
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const { data: recommendations = [], isLoading: loadingRecs } = useQuery({
    queryKey: ["copilot-recommendations", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_recommendations" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: hasCopilotAccess,
  });

  const generateProgram = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("copilot-generate", {
        body: { client_id: clientId, action: "generate_program" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copilot-recommendations", clientId] });
      toast({ title: "تم إنشاء البرنامج بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الإنشاء", description: err.message, variant: "destructive" });
    },
  });

  const weeklyEval = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("copilot-generate", {
        body: { client_id: clientId, action: "weekly_evaluation" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copilot-recommendations", clientId] });
      toast({ title: "تم تقييم الأسبوع" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const applyRec = useMutation({
    mutationFn: async ({ id, decision, editedPayload }: { id: string; decision: "accepted" | "rejected"; editedPayload?: any }) => {
      const { data, error } = await supabase.functions.invoke("copilot-apply", {
        body: { recommendation_id: id, decision, edited_payload: editedPayload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["copilot-recommendations", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["assigned-program"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({
        title: vars.decision === "accepted" ? "تم تطبيق التوصية" : "تم رفض التوصية",
      });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const isGenerating = generateProgram.isPending || weeklyEval.isPending;
  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");

  useEffect(() => {
    if (!isGenerating) {
      setMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % progressMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isGenerating]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "program": return <Dumbbell className="w-4 h-4" />;
      case "evaluation": return <TrendingUp className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">معلق</span>;
      case "accepted": return <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">مقبول</span>;
      case "rejected": return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">مرفوض</span>;
      default: return null;
    }
  };

  if (!hasCopilotAccess) {
    return (
      <>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-background text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-card-foreground">هذه الميزة للباقة الاحترافية</h3>
            <p className="text-sm text-muted-foreground mt-1">احصل على عملاء غير محدودين + AI كوبايلت + التحديات الجماعية</p>
          </div>
          <Button onClick={() => setShowUpgrade(true)}>ترقية للاحترافي - 69 ريال/شهر ←</Button>
        </Card>
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          title={getProFeatureBlockReason().title}
          description={getProFeatureBlockReason().description}
          ctaText="ترقية للاحترافي - 69 ريال/شهر ←"
          secondaryText="لاحقاً"
          onUpgrade={() => {
            setShowUpgrade(false);
            setShowPlans(true);
          }}
        />
        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-card-foreground">مساعد المدرب الذكي 🤖</h3>
            <p className="text-xs text-muted-foreground">أخبر الكوبايلت عن عميلك ثم راجع البرنامج قبل الحفظ</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => generateProgram.mutate()} disabled={isGenerating} className="gap-1.5">
            {generateProgram.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            توليد برنامج بالذكاء الاصطناعي ✨
          </Button>
          <Button variant="outline" onClick={() => weeklyEval.mutate()} disabled={isGenerating} className="gap-1.5">
            {weeklyEval.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            تقييم أسبوعي
          </Button>
        </div>

        {isGenerating && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-background/60 p-4 text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Bot className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-sm font-medium text-card-foreground">الكوبايلت يصمم برنامجك... ✨</p>
            <p className="text-xs text-muted-foreground">{progressMessages[messageIndex]}</p>
          </div>
        )}
      </Card>

      {pendingRecs.length > 0 && (
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-bold text-card-foreground text-sm">
              توصيات بانتظار الموافقة ({pendingRecs.length})
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">قبول البرنامج كاملاً | تعديل قبل الحفظ | توليد برنامج جديد</p>
          <div className="space-y-3">
            {pendingRecs.map((rec: any) => (
              <EditableRecommendationCard
                key={rec.id}
                rec={rec}
                expanded={expandedRec === rec.id}
                onToggle={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                onAccept={(editedPayload) => applyRec.mutate({ id: rec.id, decision: "accepted", editedPayload })}
                onReject={() => applyRec.mutate({ id: rec.id, decision: "rejected" })}
                isApplying={applyRec.isPending}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </Card>
      )}

      {recommendations.filter((r: any) => r.status !== "pending").length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold text-card-foreground text-sm mb-3">السجل</h3>
          <div className="space-y-2">
            {recommendations
              .filter((r: any) => r.status !== "pending")
              .slice(0, 5)
              .map((rec: any) => (
                <div key={rec.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(rec.type)}
                    <div>
                      <p className="text-sm font-medium text-secondary-foreground">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rec.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(rec.status)}
                </div>
              ))}
          </div>
        </Card>
      )}

      {!loadingRecs && recommendations.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-muted-foreground">
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لم يتم استخدام المساعد الذكي بعد</p>
          <p className="text-xs mt-1">اضغط "توليد برنامج بالذكاء الاصطناعي ✨" لإنشاء برنامج مخصص لهذا العميل</p>
        </div>
      )}
    </div>
  );
};

function EditableRecommendationCard({
  rec,
  expanded,
  onToggle,
  onAccept,
  onReject,
  isApplying,
  getTypeIcon,
}: {
  rec: any;
  expanded: boolean;
  onToggle: () => void;
  onAccept: (editedPayload: any) => void;
  onReject: () => void;
  isApplying: boolean;
  getTypeIcon: (type: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editPayload, setEditPayload] = useState<any>(null);

  const startEditing = () => {
    setEditPayload(JSON.parse(JSON.stringify(rec.payload)));
    setEditing(true);
  };

  const currentPayload = editing ? editPayload : rec.payload || {};

  const updateExercise = (dayIdx: number, exIdx: number, field: string, value: any) => {
    const updated = { ...editPayload };
    updated.program.days[dayIdx].exercises[exIdx][field] = value;
    setEditPayload(updated);
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const updated = { ...editPayload };
    updated.program.days[dayIdx].exercises.splice(exIdx, 1);
    setEditPayload({ ...updated });
  };

  const addExercise = (dayIdx: number) => {
    const updated = { ...editPayload };
    const exercises = updated.program.days[dayIdx].exercises;
    exercises.push({
      name: "تمرين جديد",
      sets: 3,
      reps: 10,
      weight: 0,
      exercise_order: exercises.length,
    });
    setEditPayload({ ...updated });
  };

  const updateDayName = (dayIdx: number, name: string) => {
    const updated = { ...editPayload };
    updated.program.days[dayIdx].day_name = name;
    setEditPayload(updated);
  };

  const updateMeal = (mealIdx: number, field: string, value: any) => {
    const updated = { ...editPayload };
    updated.meal_plan.meals[mealIdx][field] = value;
    setEditPayload(updated);
  };

  const removeMeal = (mealIdx: number) => {
    const updated = { ...editPayload };
    updated.meal_plan.meals.splice(mealIdx, 1);
    setEditPayload({ ...updated });
  };

  const addMeal = () => {
    const updated = { ...editPayload };
    if (!updated.meal_plan) updated.meal_plan = { name: "خطة تغذية", meals: [], notes: "" };
    updated.meal_plan.meals.push({
      meal_name: "وجبة",
      food_name: "طعام جديد",
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      quantity: "",
      item_order: updated.meal_plan.meals.length,
    });
    setEditPayload({ ...updated });
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-right">
        <div className="flex items-center gap-2">
          {getTypeIcon(rec.type)}
          <div>
            <p className="text-sm font-bold text-card-foreground">{rec.title}</p>
            {rec.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rec.summary}</p>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {rec.type === "program" && !editing && (
            <Button variant="outline" size="sm" className="gap-1 w-full" onClick={startEditing}>
              <Pencil className="w-3 h-3" /> تعديل قبل الحفظ
            </Button>
          )}
          {editing && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Pencil className="w-3 h-3" /> وضع التعديل — عدّل ثم اعتمد
            </div>
          )}

          {rec.type === "program" && currentPayload.program && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-card-foreground flex items-center gap-1">
                <Dumbbell className="w-3 h-3" /> البرنامج: {currentPayload.program.name}
              </h4>
              {currentPayload.program.days?.map((day: any, dayIdx: number) => (
                <div key={dayIdx} className="bg-secondary rounded-lg p-2.5 space-y-1.5">
                  {editing ? (
                    <Input
                      value={day.day_name}
                      onChange={(e) => updateDayName(dayIdx, e.target.value)}
                      className="h-7 text-xs font-bold bg-card"
                    />
                  ) : (
                    <p className="text-xs font-bold text-secondary-foreground">{day.day_name}</p>
                  )}

                  {day.exercises?.map((ex: any, exIdx: number) =>
                    editing ? (
                      <div key={exIdx} className="flex items-center gap-1.5 bg-card rounded p-1.5">
                        <Input value={ex.name} onChange={(e) => updateExercise(dayIdx, exIdx, "name", e.target.value)} className="h-6 text-[11px] flex-1" placeholder="اسم التمرين" />
                        <Input type="number" value={ex.sets} onChange={(e) => updateExercise(dayIdx, exIdx, "sets", parseInt(e.target.value) || 0)} className="h-6 text-[11px] w-12 text-center" placeholder="مج" />
                        <span className="text-[10px] text-muted-foreground">×</span>
                        <Input type="number" value={ex.reps} onChange={(e) => updateExercise(dayIdx, exIdx, "reps", parseInt(e.target.value) || 0)} className="h-6 text-[11px] w-12 text-center" placeholder="تكرار" />
                        <Input type="number" value={ex.weight} onChange={(e) => updateExercise(dayIdx, exIdx, "weight", parseFloat(e.target.value) || 0)} className="h-6 text-[11px] w-14 text-center" placeholder="كجم" />
                        <button onClick={() => removeExercise(dayIdx, exIdx)} className="text-destructive hover:text-destructive/80 p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p key={exIdx} className="text-[11px] text-muted-foreground">
                        • {ex.name} — {ex.sets}×{ex.reps} {ex.weight > 0 && `(${ex.weight} كجم)`}
                      </p>
                    )
                  )}

                  {editing && (
                    <button onClick={() => addExercise(dayIdx)} className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-1">
                      <Plus className="w-3 h-3" /> إضافة تمرين
                    </button>
                  )}
                </div>
              ))}

              {currentPayload.meal_plan && (
                <>
                  <h4 className="text-xs font-bold text-card-foreground flex items-center gap-1 mt-2">
                    <Apple className="w-3 h-3" /> التغذية: {currentPayload.meal_plan.name}
                  </h4>
                  <div className="bg-secondary rounded-lg p-2.5 space-y-1.5">
                    {currentPayload.meal_plan.meals?.map((meal: any, mealIdx: number) =>
                      editing ? (
                        <div key={mealIdx} className="flex items-center gap-1.5 bg-card rounded p-1.5">
                          <Input value={meal.meal_name} onChange={(e) => updateMeal(mealIdx, "meal_name", e.target.value)} className="h-6 text-[11px] w-16" placeholder="وجبة" />
                          <Input value={meal.food_name} onChange={(e) => updateMeal(mealIdx, "food_name", e.target.value)} className="h-6 text-[11px] flex-1" placeholder="اسم الطعام" />
                          <Input type="number" value={meal.calories} onChange={(e) => updateMeal(mealIdx, "calories", parseInt(e.target.value) || 0)} className="h-6 text-[11px] w-14 text-center" placeholder="سعرات" />
                          <Input type="number" value={meal.protein} onChange={(e) => updateMeal(mealIdx, "protein", parseInt(e.target.value) || 0)} className="h-6 text-[11px] w-12 text-center" placeholder="بروتين" />
                          <button onClick={() => removeMeal(mealIdx)} className="text-destructive hover:text-destructive/80 p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <p key={mealIdx} className="text-[11px] text-muted-foreground">
                          • {meal.meal_name}: {meal.food_name} ({meal.calories} سعرة | بروتين {meal.protein}g)
                        </p>
                      )
                    )}
                    {editing && (
                      <button onClick={addMeal} className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-1">
                        <Plus className="w-3 h-3" /> إضافة وجبة
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {rec.type === "evaluation" && currentPayload.recommendations && (
            <div className="space-y-2">
              {currentPayload.recommendations.map((r: any, i: number) => (
                <div key={i} className={`rounded-lg p-2.5 border ${
                  r.priority === "high" ? "border-destructive/30 bg-destructive/5" :
                  r.priority === "medium" ? "border-warning/30 bg-warning/5" :
                  "border-border bg-secondary"
                }`}>
                  <p className="text-xs font-bold text-card-foreground">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 gap-1" onClick={() => onAccept(editing ? editPayload : undefined)} disabled={isApplying}>
              {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {editing ? "✅ قبول بعد التعديل" : rec.type === "program" ? "✅ قبول البرنامج كاملاً" : "✅ موافق"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={onReject} disabled={isApplying}>
              <X className="w-3 h-3" /> ❌ تجاهل
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CopilotPanel;
