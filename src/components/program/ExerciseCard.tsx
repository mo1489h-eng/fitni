import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp, ChevronDown, X, CopyPlus, Link2, GripVertical,
  Plus, MoreHorizontal, FileText, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getArabicBodyPart, BODY_PART_CONFIG } from "@/lib/exercise-translations";
import { LocalExercise, SetDetail } from "./types";

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
  const [showNotes, setShowNotes] = useState(false);
  const bodyPartColor = BODY_PART_CONFIG[ex.muscle]?.color || "bg-muted text-muted-foreground";

  // Initialize set details if not present
  const setDetails: SetDetail[] = ex.setDetails || Array.from({ length: ex.sets }, (_, i) => ({
    setNumber: i + 1,
    weight: ex.weight,
    reps: ex.reps,
    tempo: ex.tempo,
    rest: ex.rest_seconds,
  }));

  const updateSetDetail = (setIndex: number, field: keyof SetDetail, value: any) => {
    const newDetails = [...setDetails];
    newDetails[setIndex] = { ...newDetails[setIndex], [field]: value };
    onUpdate("setDetails", newDetails);
  };

  const addSet = () => {
    const lastSet = setDetails[setDetails.length - 1] || { weight: 0, reps: 10, tempo: "", rest: 60 };
    const newDetails = [...setDetails, {
      setNumber: setDetails.length + 1,
      weight: lastSet.weight,
      reps: lastSet.reps,
      tempo: lastSet.tempo,
      rest: lastSet.rest,
    }];
    onUpdate("setDetails", newDetails);
    onUpdate("sets", newDetails.length);
  };

  const removeSet = (idx: number) => {
    if (setDetails.length <= 1) return;
    const newDetails = setDetails.filter((_, i) => i !== idx).map((s, i) => ({ ...s, setNumber: i + 1 }));
    onUpdate("setDetails", newDetails);
    onUpdate("sets", newDetails.length);
  };

  return (
    <Card className={`overflow-hidden transition-all ${isSuperset ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
      {/* Exercise Header */}
      <div className="flex items-start gap-2.5 p-3">
        {/* Reorder */}
        {!isWarmup && (
          <div className="flex flex-col gap-0.5 pt-1">
            {onMoveUp && <button onClick={onMoveUp} className="text-muted-foreground hover:text-foreground"><ChevronUp className="w-3 h-3" strokeWidth={1.5} /></button>}
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
            {onMoveDown && <button onClick={onMoveDown} className="text-muted-foreground hover:text-foreground"><ChevronDown className="w-3 h-3" strokeWidth={1.5} /></button>}
          </div>
        )}

        {/* GIF Thumbnail */}
        {ex.gifUrl ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${bodyPartColor}`}>
            <GripVertical className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}

        {/* Name + Tags */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-foreground truncate">{ex.name}</p>
          {ex.name_en && <p className="text-[10px] text-muted-foreground truncate">{ex.name_en}</p>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${bodyPartColor}`}>
              {getArabicBodyPart(ex.muscle) || ex.muscle}
            </Badge>
            {isSuperset && <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] px-1.5">SS</Badge>}
            {ex.rpe && <span className="text-[9px] text-amber-400 font-medium">RPE {ex.rpe}</span>}
          </div>
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground p-1">
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate} className="gap-2 text-xs">
                <CopyPlus className="w-3.5 h-3.5" />نسخ التمرين
              </DropdownMenuItem>
            )}
            {onSuperset && (
              <DropdownMenuItem onClick={onSuperset} className="gap-2 text-xs">
                <Link2 className="w-3.5 h-3.5" />سوبرسيت
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowNotes(!showNotes)} className="gap-2 text-xs">
              <FileText className="w-3.5 h-3.5" />ملاحظة
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="gap-2 text-xs text-destructive">
              <Trash2 className="w-3.5 h-3.5" />حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Set Table */}
      <div className="border-t border-border">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_32px] gap-1 px-3 py-1.5 bg-muted/30 text-[9px] font-bold text-muted-foreground">
          <span className="text-center">Set</span>
          <span className="text-center">وزن (كجم)</span>
          <span className="text-center">تكرار</span>
          <span className="text-center">تمبو</span>
          <span className="text-center">راحة (ث)</span>
          <span></span>
        </div>

        {/* Set Rows */}
        {setDetails.map((set, idx) => (
          <div key={idx} className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_32px] gap-1 px-3 py-1 border-t border-border/50 items-center">
            <span className="text-center text-[10px] font-bold text-muted-foreground">{set.setNumber}</span>
            <Input
              type="number" dir="ltr" value={set.weight || ""}
              onChange={e => updateSetDetail(idx, "weight", Number(e.target.value) || 0)}
              className="h-7 text-center text-xs font-medium border-0 bg-transparent p-0 focus-visible:ring-1"
              placeholder="0"
            />
            <Input
              type="number" dir="ltr" value={set.reps || ""}
              onChange={e => updateSetDetail(idx, "reps", Number(e.target.value) || 0)}
              className="h-7 text-center text-xs font-medium border-0 bg-transparent p-0 focus-visible:ring-1"
              placeholder="10"
            />
            <Input
              dir="ltr" value={set.tempo}
              onChange={e => updateSetDetail(idx, "tempo", e.target.value)}
              className="h-7 text-center text-[10px] font-mono border-0 bg-transparent p-0 focus-visible:ring-1"
              placeholder="3-1-2-0"
            />
            <Input
              type="number" dir="ltr" value={set.rest || ""}
              onChange={e => updateSetDetail(idx, "rest", Number(e.target.value) || 0)}
              className="h-7 text-center text-xs font-medium border-0 bg-transparent p-0 focus-visible:ring-1"
              placeholder="60"
            />
            <button onClick={() => removeSet(idx)} className="text-muted-foreground/40 hover:text-destructive p-0.5">
              <X className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        ))}

        {/* Add Set Button */}
        <button
          onClick={addSet}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-primary font-medium hover:bg-primary/5 transition-colors border-t border-border/50"
        >
          <Plus className="w-3 h-3" strokeWidth={2} />إضافة سيت
        </button>
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="border-t border-border p-3">
          <Input
            placeholder="ملاحظة للمتدرب..."
            value={ex.notes}
            onChange={e => onUpdate("notes", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      )}
    </Card>
  );
};

export default ExerciseCard;
