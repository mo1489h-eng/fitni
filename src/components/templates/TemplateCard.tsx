import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Copy, Dumbbell, Eye, Pencil, Trash2, Users } from "lucide-react";

interface TemplateCardProps {
  template: any;
  isOwn: boolean;
  onPreview: () => void;
  onAssign: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}

const getCategoryColor = (cat: string) => {
  const map: Record<string, string> = {
    "تخسيس": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "بناء عضلات": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "قوة": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "لياقة عامة": "bg-primary/10 text-primary border-primary/20",
    "تأهيل": "bg-primary/10 text-muted-foreground border-primary/20",
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

const TemplateCard = ({ template, isOwn, onPreview, onAssign, onEdit, onDuplicate, onDelete }: TemplateCardProps) => {
  const programData = typeof template.program_data === 'string'
    ? JSON.parse(template.program_data)
    : template.program_data || [];
  const totalExercises = programData.reduce((sum: number, day: any) => sum + (day.exercises?.length || 0), 0);

  return (
    <Card className="p-4 transition-all hover:shadow-md hover:border-primary/30 group">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-bold text-card-foreground text-sm">{template.name}</h3>
          {template.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.category && (
            <Badge variant="outline" className={`text-[9px] ${getCategoryColor(template.category)}`}>
              {template.category}
            </Badge>
          )}
          {template.level && (
            <Badge variant="outline" className={`text-[9px] ${getLevelColor(template.level)}`}>
              {template.level}
            </Badge>
          )}
          {template.is_system && (
            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">CoachBase</Badge>
          )}
          {template.is_public && !template.is_system && (
            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">عام</Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{template.duration_weeks} أسابيع</span>
          <span className="flex items-center gap-0.5"><Dumbbell className="w-3 h-3" />{template.days_per_week} أيام/أسبوع</span>
          <span>{totalExercises} تمرين</span>
          {(template.use_count || 0) > 0 && (
            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{template.use_count}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="text-[10px] h-7 gap-0.5" onClick={onPreview}>
            <Eye className="w-3 h-3" />معاينة
          </Button>
          <Button size="sm" className="text-[10px] h-7 gap-0.5" onClick={onAssign}>
            <Users className="w-3 h-3" />تعيين لعميل
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-7 gap-0.5" onClick={onDuplicate}>
            <Copy className="w-3 h-3" />نسخ
          </Button>
          {isOwn && onEdit && (
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-0.5" onClick={onEdit}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          {isOwn && onDelete && (
            <Button variant="outline" size="sm" className="text-[10px] h-7 gap-0.5 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TemplateCard;
