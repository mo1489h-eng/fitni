import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp, ChevronDown, X, CopyPlus, Link2, GripVertical,
  Timer, Gauge, FileText, Video,
} from "lucide-react";
import { MUSCLE_COLORS } from "@/components/ExerciseLibraryDialog";

export interface LocalExercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  weight: number;
  video_url: string;
  rest_seconds: number;
  tempo: string;
  rpe: number | null;
  notes: string;
  supersetWith?: string;
  is_warmup: boolean;
}

interface Props {
  ex: LocalExercise;
  isWarmup?: boolean;
  isSuperset?: boolean;
  onUpdate: (field: keyof LocalExercise, value: any) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSuperset?: () => void;
}

const ExerciseCard = ({
  ex, isWarmup, isSuperset,
  onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, onSuperset,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const muscleColor = MUSCLE_COLORS[ex.muscle] || "bg-muted text-muted-foreground";

  return (
    <Card className={`overflow-hidden transition-all ${isSuperset ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
      {/* Main Row */}
      <div className="flex items-center gap-2 p-3">
        {!isWarmup && (
          <div className="flex flex-col gap-0.5">
            {onMoveUp && <button onClick={onMoveUp} className="text-muted-foreground hover:text-foreground"><ChevronUp className="w-3 h-3" strokeWidth={1.5} /></button>}
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
            {onMoveDown && <button onClick={onMoveDown} className="text-muted-foreground hover:text-foreground"><ChevronDown className="w-3 h-3" strokeWidth={1.5} /></button>}
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-right min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{ex.name}</p>
            {isSuperset && <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] px-1.5">SS</Badge>}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="secondary" className={`text-[9px] ${muscleColor}`}>{ex.muscle}</Badge>
            {ex.rpe && <span className="text-[9px] text-amber-400">RPE {ex.rpe}</span>}
            {ex.tempo && <span className="text-[9px] text-muted-foreground">{ex.tempo}</span>}
          </div>
        </button>

        {/* Quick Stats */}
        <div className="text-left text-[10px] text-muted-foreground whitespace-nowrap space-y-0.5">
          <p className="font-medium">{ex.sets}x{ex.reps}</p>
          {ex.weight > 0 && <p>{ex.weight}كجم</p>}
          {ex.rest_seconds > 0 && <p className="flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" strokeWidth={1.5} />{ex.rest_seconds}ث</p>}
        </div>

        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/10">
          {/* Sets/Reps/Weight/Rest Grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "السيتات", field: "sets" as const, value: ex.sets },
              { label: "التكرارات", field: "reps" as const, value: ex.reps },
              { label: "الوزن كجم", field: "weight" as const, value: ex.weight },
              { label: "راحة (ث)", field: "rest_seconds" as const, value: ex.rest_seconds },
            ].map(f => (
              <div key={f.field}>
                <label className="text-[10px] text-muted-foreground block mb-1">{f.label}</label>
                <Input type="number" dir="ltr" value={f.value}
                  onChange={e => onUpdate(f.field, Number(e.target.value) || 0)}
                  className="h-9 text-center text-sm font-bold" />
              </div>
            ))}
          </div>

          {/* Tempo + RPE */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3" strokeWidth={1.5} />Tempo
              </label>
              <Input dir="ltr" placeholder="3-1-2-0" value={ex.tempo}
                onChange={e => onUpdate("tempo", e.target.value)}
                className="h-8 text-xs text-center font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3" strokeWidth={1.5} />RPE
              </label>
              <Input type="number" dir="ltr" min={1} max={10} step={0.5}
                placeholder="7" value={ex.rpe ?? ""}
                onChange={e => onUpdate("rpe", e.target.value ? Number(e.target.value) : null)}
                className="h-8 text-xs text-center font-bold" />
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
              <Video className="w-3 h-3" strokeWidth={1.5} />رابط الفيديو
            </label>
            <Input type="url" dir="ltr" placeholder="https://..." value={ex.video_url}
              onChange={e => onUpdate("video_url", e.target.value)} className="h-8 text-xs" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" strokeWidth={1.5} />ملاحظة للمتدرب
            </label>
            <Input placeholder="مثال: ركز على السلبي 3 ثواني..."
              value={ex.notes} onChange={e => onUpdate("notes", e.target.value)}
              className="h-8 text-xs" />
          </div>

          {/* Action Buttons */}
          {!isWarmup && (
            <div className="flex gap-2 pt-1">
              {onDuplicate && (
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={onDuplicate}>
                  <CopyPlus className="w-3 h-3" strokeWidth={1.5} />نسخ
                </Button>
              )}
              {onSuperset && (
                <Button variant="outline" size="sm"
                  className={`text-[10px] h-7 gap-1 flex-1 ${isSuperset ? "border-primary/30 text-primary" : ""}`}
                  onClick={onSuperset}>
                  <Link2 className="w-3 h-3" strokeWidth={1.5} />سوبرسيت
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ExerciseCard;
