import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Loader2, Sparkles, Check, X, Dumbbell, Apple,
  ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Zap,
} from "lucide-react";

interface CopilotPanelProps {
  clientId: string;
  clientName: string;
}

const CopilotPanel = ({ clientId, clientName }: CopilotPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  // Fetch existing recommendations
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
  });

  // Generate program mutation
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
      toast({ title: "تم إنشاء البرنامج بنجاح 🤖✅" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في الإنشاء", description: err.message, variant: "destructive" });
    },
  });

  // Weekly evaluation mutation
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
      toast({ title: "تم تقييم الأسبوع 📊" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  // Apply recommendation
  const applyRec = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "accepted" | "rejected" }) => {
      const { data, error } = await supabase.functions.invoke("copilot-apply", {
        body: { recommendation_id: id, decision },
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
        title: vars.decision === "accepted" ? "تم تطبيق التوصية ✅" : "تم رفض التوصية",
      });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const isGenerating = generateProgram.isPending || weeklyEval.isPending;
  const pendingRecs = recommendations.filter((r: any) => r.status === "pending");

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
      case "accepted": return <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">مقبول ✅</span>;
      case "rejected": return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">مرفوض</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Actions */}
      <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-card-foreground">مساعد المدرب الذكي 🤖</h3>
            <p className="text-xs text-muted-foreground">إنشاء برامج وتقييمات تلقائية لـ {clientName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => generateProgram.mutate()}
            disabled={isGenerating}
            className="gap-1.5"
          >
            {generateProgram.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            إنشاء برنامج AI
          </Button>
          <Button
            variant="outline"
            onClick={() => weeklyEval.mutate()}
            disabled={isGenerating}
            className="gap-1.5"
          >
            {weeklyEval.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            تقييم أسبوعي
          </Button>
        </div>

        {isGenerating && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            جاري التحليل والإنشاء... قد يستغرق بضع ثوانٍ
          </div>
        )}
      </Card>

      {/* Pending Recommendations */}
      {pendingRecs.length > 0 && (
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-bold text-card-foreground text-sm">
              توصيات بانتظار الموافقة ({pendingRecs.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingRecs.map((rec: any) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                expanded={expandedRec === rec.id}
                onToggle={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                onAccept={() => applyRec.mutate({ id: rec.id, decision: "accepted" })}
                onReject={() => applyRec.mutate({ id: rec.id, decision: "rejected" })}
                isApplying={applyRec.isPending}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </div>
        </Card>
      )}

      {/* History */}
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
          <p className="text-xs mt-1">اضغط "إنشاء برنامج AI" للبدء</p>
        </div>
      )}
    </div>
  );
};

function RecommendationCard({
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
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
  getTypeIcon: (type: string) => React.ReactNode;
}) {
  const payload = rec.payload || {};

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-2">
          {getTypeIcon(rec.type)}
          <div>
            <p className="text-sm font-bold text-card-foreground">{rec.title}</p>
            {rec.summary && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rec.summary}</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Program Preview */}
          {rec.type === "program" && payload.program && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-card-foreground flex items-center gap-1">
                <Dumbbell className="w-3 h-3" /> البرنامج: {payload.program.name}
              </h4>
              {payload.program.days?.map((day: any, i: number) => (
                <div key={i} className="bg-secondary rounded-lg p-2">
                  <p className="text-xs font-bold text-secondary-foreground mb-1">{day.day_name}</p>
                  {day.exercises?.map((ex: any, j: number) => (
                    <p key={j} className="text-[11px] text-muted-foreground">
                      • {ex.name} — {ex.sets}×{ex.reps} {ex.weight > 0 && `(${ex.weight} كجم)`}
                    </p>
                  ))}
                </div>
              ))}

              {payload.meal_plan && (
                <>
                  <h4 className="text-xs font-bold text-card-foreground flex items-center gap-1 mt-2">
                    <Apple className="w-3 h-3" /> التغذية: {payload.meal_plan.name}
                  </h4>
                  <div className="bg-secondary rounded-lg p-2">
                    {payload.meal_plan.meals?.map((meal: any, i: number) => (
                      <p key={i} className="text-[11px] text-muted-foreground">
                        • {meal.meal_name}: {meal.food_name} ({meal.calories} سعرة | بروتين {meal.protein}g)
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Evaluation Preview */}
          {rec.type === "evaluation" && payload.recommendations && (
            <div className="space-y-2">
              {payload.recommendations.map((r: any, i: number) => (
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

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={onAccept}
              disabled={isApplying}
            >
              {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {rec.type === "program" ? "اعتماد وتطبيق" : "موافقة"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={onReject}
              disabled={isApplying}
            >
              <X className="w-3 h-3" /> رفض
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CopilotPanel;
