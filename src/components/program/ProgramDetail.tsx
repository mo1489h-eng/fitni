import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, ChevronDown, ChevronUp, Trash2, BookOpen, Users,
  Calendar, Dumbbell, Timer,
} from "lucide-react";
import { useState } from "react";

interface Props {
  program: any;
  programDays: any[];
  clientCount: number;
  onBack: () => void;
  onSaveAsTemplate: (id: string) => void;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  deletePending: boolean;
}

const ProgramDetail = ({
  program, programDays, clientCount,
  onBack, onSaveAsTemplate, onAssign, onDelete, onDeleteExercise, deletePending,
}: Props) => {
  const [viewExpanded, setViewExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />البرامج
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onSaveAsTemplate(program.id)} className="gap-1 text-xs">
            <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />حفظ كقالب
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAssign(program.id)} className="gap-1 text-xs">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />تعيين
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(program.id)} disabled={deletePending}>
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <Card className="p-5 border-r-2 border-r-primary">
        <h1 className="text-xl font-bold text-card-foreground mb-2">{program.name}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />{program.weeks} أسابيع</span>
          <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" strokeWidth={1.5} />{programDays.length} أيام</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={1.5} />{clientCount} متدرب</span>
          {program.goal && <Badge variant="secondary" className="text-[10px]">{program.goal}</Badge>}
          {program.difficulty && <Badge variant="secondary" className="text-[10px]">{program.difficulty}</Badge>}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {programDays.map((day: any) => {
          const exercises = day.program_exercises || [];
          const isExp = viewExpanded === day.id;
          const estMins = exercises.reduce((s: number, e: any) => s + e.sets * ((e.rest_seconds || 60) + 45) / 60, 0);
          const totalVol = exercises.reduce((s: number, e: any) => s + e.sets * e.reps * e.weight, 0);

          return (
            <Card key={day.id} className="overflow-hidden">
              <button onClick={() => setViewExpanded(isExp ? null : day.id)}
                className="w-full flex items-center justify-between p-4 text-right hover:bg-muted/30 transition-colors">
                <div>
                  <h3 className="font-bold text-card-foreground">{day.day_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{exercises.length} تمارين</span>
                    <span className="flex items-center gap-0.5"><Timer className="w-3 h-3" strokeWidth={1.5} />~{Math.round(estMins)} د</span>
                    {totalVol > 0 && <span>{totalVol.toLocaleString()} كجم</span>}
                  </div>
                </div>
                {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />}
              </button>

              {isExp && (
                <div className="border-t border-border p-3 space-y-2">
                  {exercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد تمارين</p>}
                  {exercises.map((ex: any) => (
                    <div key={ex.id} className={`flex items-center justify-between rounded-lg p-3 ${ex.is_warmup ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-muted/50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm truncate">{ex.name}</p>
                          {ex.is_warmup && <span className="text-[9px] text-amber-400">إحماء</span>}
                          {ex.rpe && <span className="text-[9px] text-amber-400">RPE {ex.rpe}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{ex.sets}x{ex.reps}</span>
                          {ex.weight > 0 && <span>{ex.weight}كجم</span>}
                          {ex.tempo && <span className="font-mono text-[10px]">{ex.tempo}</span>}
                          {ex.rest_seconds > 0 && <span>{ex.rest_seconds}ث</span>}
                        </div>
                        {ex.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{ex.notes}</p>}
                      </div>
                      <button onClick={() => onDeleteExercise(ex.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProgramDetail;
