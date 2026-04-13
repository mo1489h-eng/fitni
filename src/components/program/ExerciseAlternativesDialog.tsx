import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import type { LocalExercise } from "@/components/program/types";
import { Sparkles } from "lucide-react";

export type ExerciseAlternativeSuggestion = {
  external_id: string;
  name_en: string;
  name_ar: string;
  body_part: string;
  equipment: string;
  reason_ar: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exercise: LocalExercise | null;
  onApply: (alt: ExerciseAlternativeSuggestion) => void;
}

export default function ExerciseAlternativesDialog({
  open,
  onOpenChange,
  exercise,
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [alts, setAlts] = useState<ExerciseAlternativeSuggestion[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !exercise) {
      setAlts([]);
      setErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase.functions.invoke("exercise-suggest-alternatives", {
          body: {
            exercise_name_en: exercise.name_en || exercise.name,
            exercise_name_ar: exercise.name,
            reason: "قيود على المفصل أو تفضيل المدرب",
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const raw = data as { error?: string; alternatives?: ExerciseAlternativeSuggestion[] } | null;
        if (raw?.error) throw new Error(raw.error);
        const list = raw?.alternatives ?? [];
        setAlts(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "تعذّر جلب الاقتراحات");
        setAlts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, exercise?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            بدائل ذكية (كوبايلت)
          </DialogTitle>
        </DialogHeader>
        {exercise && (
          <p className="text-xs text-muted-foreground">
            بدلاً عن: <span className="font-medium text-foreground">{exercise.name}</span>
          </p>
        )}
        {loading && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}
        {err && !loading && (
          <p className="text-sm text-destructive text-center py-4">{err}</p>
        )}
        {!loading && !err && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {alts.map((a) => (
              <div
                key={a.external_id}
                className="flex gap-3 p-2 rounded-lg border border-border bg-card/50"
              >
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                  <img
                    src={getExerciseImageUrl(a.external_id)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-bold truncate">{a.name_ar}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.name_en}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{a.reason_ar}</p>
                  <div className="flex gap-1 mt-1 justify-end flex-wrap">
                    <Badge variant="secondary" className="text-[9px]">{a.body_part}</Badge>
                    <Badge variant="outline" className="text-[9px]">{a.equipment}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="self-center flex-shrink-0 text-[10px] h-8"
                  onClick={() => {
                    onApply(a);
                    onOpenChange(false);
                  }}
                >
                  استبدال
                </Button>
              </div>
            ))}
            {alts.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد اقتراحات حالياً</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
