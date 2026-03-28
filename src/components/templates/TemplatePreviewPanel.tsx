import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, Dumbbell, Users, X } from "lucide-react";

interface TemplatePreviewPanelProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template: any;
  onAssign: () => void;
}

const getCategoryColor = (cat: string) => {
  const map: Record<string, string> = {
    "تخسيس": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "بناء عضلات": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "قوة": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "لياقة عامة": "bg-primary/10 text-primary border-primary/20",
    "تأهيل": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "رياضي": "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[cat] || "bg-muted text-muted-foreground";
};

const getLevelColor = (level: string) => {
  const map: Record<string, string> = {
    "مبتدئ": "bg-primary/10 text-primary border-primary/20",
    "متوسط": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "متقدم": "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[level] || "bg-muted text-muted-foreground";
};

const TemplatePreviewPanel = ({ open, onOpenChange, template, onAssign }: TemplatePreviewPanelProps) => {
  if (!template) return null;

  const programData = typeof template.program_data === 'string'
    ? JSON.parse(template.program_data)
    : template.program_data || [];

  const totalExercises = programData.reduce((sum: number, day: any) => sum + (day.exercises?.length || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:w-[420px] p-0 overflow-y-auto" dir="rtl">
        <div className="p-5 space-y-5">
          <SheetHeader className="space-y-3">
            <SheetTitle className="text-lg font-bold text-foreground">{template.name}</SheetTitle>
            <div className="flex flex-wrap gap-1.5">
              {template.category && (
                <Badge variant="outline" className={`text-[10px] ${getCategoryColor(template.category)}`}>
                  {template.category}
                </Badge>
              )}
              {template.level && (
                <Badge variant="outline" className={`text-[10px] ${getLevelColor(template.level)}`}>
                  {template.level}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}

          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />{template.duration_weeks} أسابيع
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />{template.days_per_week} أيام/أسبوع
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />{template.use_count || 0} استخدام
            </span>
          </div>

          {/* Days breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">تفاصيل البرنامج</h3>
            {programData.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد بيانات</p>
            ) : (
              programData.map((day: any, i: number) => (
                <div key={i} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm font-bold text-foreground mb-2">
                    {day.dayName || `اليوم ${i + 1}`}
                  </p>
                  <div className="space-y-1">
                    {(day.exercises || []).map((ex: any, j: number) => (
                      <div key={j} className="flex justify-between items-center text-xs bg-card rounded px-2.5 py-1.5">
                        <span className="text-foreground font-medium">{ex.name}</span>
                        <span className="text-muted-foreground">
                          {ex.sets}×{ex.reps}
                          {ex.weight > 0 && ` • ${ex.weight}كجم`}
                        </span>
                      </div>
                    ))}
                    {(!day.exercises || day.exercises.length === 0) && (
                      <p className="text-[10px] text-muted-foreground">يوم راحة</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-primary">{totalExercises} تمرين إجمالي</p>
          </div>

          <Button className="w-full gap-2" onClick={onAssign}>
            <Users className="w-4 h-4" />تعيين لعميل
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TemplatePreviewPanel;
