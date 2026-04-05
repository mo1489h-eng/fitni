import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, GripVertical, Pencil, Trash2, BookOpen, Video,
  FileText, Type, ChevronDown, ChevronUp, Eye
} from "lucide-react";

type VaultLesson = {
  id: string;
  unit_id: string;
  title: string;
  content_type: "video" | "pdf" | "article";
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
};

type VaultUnit = {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  unit_order: number;
  visibility: string;
  created_at: string;
  lessons?: VaultLesson[];
};

const visibilityLabels: Record<string, string> = {
  all: "كل العملاء",
  basic: "Basic فقط",
  pro: "Pro فقط",
};

const contentTypeLabels: Record<string, string> = {
  video: "فيديو",
  pdf: "ملف PDF",
  article: "مقالة",
};

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  article: Type,
};

const Vault = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState<VaultUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Unit dialog
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<VaultUnit | null>(null);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitDesc, setUnitDesc] = useState("");
  const [unitVisibility, setUnitVisibility] = useState("all");

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<VaultLesson | null>(null);
  const [lessonUnitId, setLessonUnitId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<"video" | "pdf" | "article">("video");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonText, setLessonText] = useState("");

  const fetchUnits = async () => {
    if (!user) return;
    const { data: unitsData } = await supabase
      .from("vault_units")
      .select("*")
      .eq("trainer_id", user.id)
      .order("unit_order");

    if (!unitsData) { setLoading(false); return; }

    const unitIds = unitsData.map((u: any) => u.id);
    const { data: lessonsData } = await supabase
      .from("vault_lessons")
      .select("*")
      .in("unit_id", unitIds.length > 0 ? unitIds : ["__none__"])
      .order("lesson_order");

    const mapped = unitsData.map((u: any) => ({
      ...u,
      lessons: (lessonsData || []).filter((l: any) => l.unit_id === u.id),
    }));
    setUnits(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, [user]);

  // Unit CRUD
  const openNewUnit = () => {
    setEditingUnit(null);
    setUnitTitle("");
    setUnitDesc("");
    setUnitVisibility("all");
    setUnitDialogOpen(true);
  };

  const openEditUnit = (u: VaultUnit) => {
    setEditingUnit(u);
    setUnitTitle(u.title);
    setUnitDesc(u.description || "");
    setUnitVisibility(u.visibility);
    setUnitDialogOpen(true);
  };

  const saveUnit = async () => {
    if (!user || !unitTitle.trim()) return;
    if (editingUnit) {
      await supabase.from("vault_units").update({
        title: unitTitle.trim(),
        description: unitDesc.trim() || null,
        visibility: unitVisibility,
      }).eq("id", editingUnit.id);
      toast.success("تم تحديث الوحدة");
    } else {
      await supabase.from("vault_units").insert({
        trainer_id: user.id,
        title: unitTitle.trim(),
        description: unitDesc.trim() || null,
        visibility: unitVisibility,
        unit_order: units.length,
      });
      toast.success("تم إنشاء الوحدة");
    }
    setUnitDialogOpen(false);
    fetchUnits();
  };

  const deleteUnit = async (id: string) => {
    await supabase.from("vault_units").delete().eq("id", id);
    toast.success("تم حذف الوحدة");
    fetchUnits();
  };

  // Lesson CRUD
  const openNewLesson = (unitId: string) => {
    setEditingLesson(null);
    setLessonUnitId(unitId);
    setLessonTitle("");
    setLessonType("video");
    setLessonUrl("");
    setLessonText("");
    setLessonDialogOpen(true);
  };

  const openEditLesson = (l: VaultLesson) => {
    setEditingLesson(l);
    setLessonUnitId(l.unit_id);
    setLessonTitle(l.title);
    setLessonType(l.content_type);
    setLessonUrl(l.content_url || "");
    setLessonText(l.content_text || "");
    setLessonDialogOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonUnitId || !lessonTitle.trim()) return;
    const unit = units.find((u) => u.id === lessonUnitId);
    const payload = {
      title: lessonTitle.trim(),
      content_type: lessonType,
      content_url: lessonType !== "article" ? lessonUrl.trim() || null : null,
      content_text: lessonType === "article" ? lessonText : null,
    };
    if (editingLesson) {
      await supabase.from("vault_lessons").update(payload).eq("id", editingLesson.id);
      toast.success("تم تحديث الدرس");
    } else {
      await supabase.from("vault_lessons").insert({
        ...payload,
        unit_id: lessonUnitId,
        lesson_order: (unit?.lessons?.length || 0),
      });
      toast.success("تم إضافة الدرس");
    }
    setLessonDialogOpen(false);
    fetchUnits();
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("vault_lessons").delete().eq("id", id);
    toast.success("تم حذف الدرس");
    fetchUnits();
  };

  const moveLessonOrder = async (lesson: VaultLesson, direction: "up" | "down") => {
    const unit = units.find((u) => u.id === lesson.unit_id);
    if (!unit?.lessons) return;
    const sorted = [...unit.lessons].sort((a, b) => a.lesson_order - b.lesson_order);
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    await Promise.all([
      supabase.from("vault_lessons").update({ lesson_order: sorted[swapIdx].lesson_order }).eq("id", lesson.id),
      supabase.from("vault_lessons").update({ lesson_order: lesson.lesson_order }).eq("id", sorted[swapIdx].id),
    ]);
    fetchUnits();
  };

  return (
    <TrainerLayout title="المكتبة التعليمية">
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">أنشئ وحدات تعليمية وأضف دروس لعملائك</p>
          <Button onClick={openNewUnit} className="gap-2">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            وحدة جديدة
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
        ) : units.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 bg-card border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground">لا توجد وحدات تعليمية بعد</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {units.map((unit) => {
              const expanded = expandedUnit === unit.id;
              const lessons = unit.lessons || [];
              return (
                <Card key={unit.id} className="bg-card border-border overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedUnit(expanded ? null : unit.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{unit.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {visibilityLabels[unit.visibility]}
                        </span>
                      </div>
                      {unit.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{unit.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{lessons.length} درس</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditUnit(unit); }}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteUnit(unit.id); }}>
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border bg-background/50 p-4 space-y-2">
                      {lessons.sort((a, b) => a.lesson_order - b.lesson_order).map((lesson, idx) => {
                        const Icon = contentTypeIcons[lesson.content_type] || FileText;
                        return (
                          <div key={lesson.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button onClick={() => moveLessonOrder(lesson, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button onClick={() => moveLessonOrder(lesson, "down")} disabled={idx === lessons.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                            <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                              <p className="text-[10px] text-muted-foreground">{contentTypeLabels[lesson.content_type]}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLesson(lesson)}>
                              <Pencil className="h-3 w-3" strokeWidth={1.5} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLesson(lesson.id)}>
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            </Button>
                          </div>
                        );
                      })}
                      <Button variant="outline" size="sm" className="w-full gap-2 mt-2" onClick={() => openNewLesson(unit.id)}>
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        إضافة درس
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="bg-card border-border" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "تعديل الوحدة" : "وحدة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="عنوان الوحدة" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
            <Textarea placeholder="وصف (اختياري)" value={unitDesc} onChange={(e) => setUnitDesc(e.target.value)} rows={3} />
            <Select value={unitVisibility} onValueChange={setUnitVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملاء</SelectItem>
                <SelectItem value="basic">Basic فقط</SelectItem>
                <SelectItem value="pro">Pro فقط</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={saveUnit} className="w-full" disabled={!unitTitle.trim()}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="bg-card border-border" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "تعديل الدرس" : "درس جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="عنوان الدرس" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            <Select value={lessonType} onValueChange={(v) => setLessonType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">فيديو</SelectItem>
                <SelectItem value="pdf">ملف PDF</SelectItem>
                <SelectItem value="article">مقالة</SelectItem>
              </SelectContent>
            </Select>
            {lessonType !== "article" && (
              <Input
                placeholder={lessonType === "video" ? "رابط YouTube أو Vimeo" : "رابط ملف PDF"}
                value={lessonUrl}
                onChange={(e) => setLessonUrl(e.target.value)}
              />
            )}
            {lessonType === "article" && (
              <Textarea placeholder="محتوى المقالة" value={lessonText} onChange={(e) => setLessonText(e.target.value)} rows={8} />
            )}
            <Button onClick={saveLesson} className="w-full" disabled={!lessonTitle.trim()}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  );
};

export default Vault;
