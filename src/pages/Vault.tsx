import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus, GripVertical, Pencil, Trash2, BookOpen, Video,
  FileText, Type, ChevronDown, ChevronUp, Check, X, Save
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
  pdf: "PDF",
  article: "مقال",
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

  // Inline new unit state
  const [newUnitActive, setNewUnitActive] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [newUnitDesc, setNewUnitDesc] = useState("");
  const [newUnitVis, setNewUnitVis] = useState("all");

  // Inline edit unit
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitTitle, setEditUnitTitle] = useState("");
  const [editUnitDesc, setEditUnitDesc] = useState("");
  const [editUnitVis, setEditUnitVis] = useState("all");

  // Inline new lesson per unit
  const [newLessonUnitId, setNewLessonUnitId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"video" | "pdf" | "article">("video");
  const [newLessonUrl, setNewLessonUrl] = useState("");
  const [newLessonText, setNewLessonText] = useState("");

  // Inline edit lesson
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonType, setEditLessonType] = useState<"video" | "pdf" | "article">("video");
  const [editLessonUrl, setEditLessonUrl] = useState("");
  const [editLessonText, setEditLessonText] = useState("");

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

  // ── Unit CRUD ──
  const saveNewUnit = async () => {
    if (!user || !newUnitTitle.trim()) return;
    await supabase.from("vault_units").insert({
      trainer_id: user.id,
      title: newUnitTitle.trim(),
      description: newUnitDesc.trim() || null,
      visibility: newUnitVis,
      unit_order: units.length,
    });
    toast.success("تم إنشاء الوحدة");
    setNewUnitActive(false);
    setNewUnitTitle("");
    setNewUnitDesc("");
    setNewUnitVis("all");
    fetchUnits();
  };

  const startEditUnit = (u: VaultUnit) => {
    setEditingUnitId(u.id);
    setEditUnitTitle(u.title);
    setEditUnitDesc(u.description || "");
    setEditUnitVis(u.visibility);
  };

  const saveEditUnit = async () => {
    if (!editingUnitId || !editUnitTitle.trim()) return;
    await supabase.from("vault_units").update({
      title: editUnitTitle.trim(),
      description: editUnitDesc.trim() || null,
      visibility: editUnitVis,
    }).eq("id", editingUnitId);
    toast.success("تم تحديث الوحدة");
    setEditingUnitId(null);
    fetchUnits();
  };

  const deleteUnit = async (id: string) => {
    await supabase.from("vault_units").delete().eq("id", id);
    toast.success("تم حذف الوحدة");
    fetchUnits();
  };

  // ── Lesson CRUD ──
  const startNewLesson = (unitId: string) => {
    setNewLessonUnitId(unitId);
    setNewLessonTitle("");
    setNewLessonType("video");
    setNewLessonUrl("");
    setNewLessonText("");
  };

  const saveNewLesson = async () => {
    if (!newLessonUnitId || !newLessonTitle.trim()) return;
    const unit = units.find((u) => u.id === newLessonUnitId);
    await supabase.from("vault_lessons").insert({
      unit_id: newLessonUnitId,
      title: newLessonTitle.trim(),
      content_type: newLessonType,
      content_url: newLessonType !== "article" ? newLessonUrl.trim() || null : null,
      content_text: newLessonType === "article" ? newLessonText : null,
      lesson_order: unit?.lessons?.length || 0,
    });
    toast.success("تم إضافة الدرس");
    setNewLessonUnitId(null);
    fetchUnits();
  };

  const startEditLesson = (l: VaultLesson) => {
    setEditingLessonId(l.id);
    setEditLessonTitle(l.title);
    setEditLessonType(l.content_type);
    setEditLessonUrl(l.content_url || "");
    setEditLessonText(l.content_text || "");
  };

  const saveEditLesson = async () => {
    if (!editingLessonId || !editLessonTitle.trim()) return;
    await supabase.from("vault_lessons").update({
      title: editLessonTitle.trim(),
      content_type: editLessonType,
      content_url: editLessonType !== "article" ? editLessonUrl.trim() || null : null,
      content_text: editLessonType === "article" ? editLessonText : null,
    }).eq("id", editingLessonId);
    toast.success("تم تحديث الدرس");
    setEditingLessonId(null);
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

  // ── Inline lesson form (reused for new & edit) ──
  const renderLessonForm = (
    title: string, setTitle: (v: string) => void,
    type: "video" | "pdf" | "article", setType: (v: "video" | "pdf" | "article") => void,
    url: string, setUrl: (v: string) => void,
    text: string, setText: (v: string) => void,
    onSave: () => void, onCancel: () => void,
  ) => (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <Input
        placeholder="عنوان الدرس"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2">
        {(["video", "pdf", "article"] as const).map((t) => {
          const Icon = contentTypeIcons[t];
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {contentTypeLabels[t]}
            </button>
          );
        })}
      </div>
      {type !== "article" && (
        <Input
          placeholder={type === "video" ? "رابط YouTube أو Vimeo" : "رابط ملف PDF أو Google Drive"}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}
      {type === "article" && (
        <Textarea
          placeholder="محتوى المقالة"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
      )}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          إلغاء
        </Button>
        <Button size="sm" onClick={onSave} disabled={!title.trim()} className="gap-1.5">
          <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
          حفظ
        </Button>
      </div>
    </div>
  );

  return (
    <TrainerLayout title="المكتبة التعليمية">
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">أنشئ وحدات تعليمية وأضف دروس لعملائك</p>
          {!newUnitActive && (
            <Button onClick={() => setNewUnitActive(true)} className="gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              إضافة وحدة
            </Button>
          )}
        </div>

        {/* Inline new unit form */}
        {newUnitActive && (
          <Card className="bg-card border-primary/30 p-5 space-y-3">
            <Input
              placeholder="عنوان الوحدة"
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="وصف الوحدة (اختياري)"
              value={newUnitDesc}
              onChange={(e) => setNewUnitDesc(e.target.value)}
              rows={2}
            />
            <div className="flex items-center gap-3">
              <Select value={newUnitVis} onValueChange={setNewUnitVis}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملاء</SelectItem>
                  <SelectItem value="basic">Basic فقط</SelectItem>
                  <SelectItem value="pro">Pro فقط</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setNewUnitActive(false)} className="gap-1.5">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                إلغاء
              </Button>
              <Button size="sm" onClick={saveNewUnit} disabled={!newUnitTitle.trim()} className="gap-1.5">
                <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                حفظ
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
        ) : units.length === 0 && !newUnitActive ? (
          <Card className="flex flex-col items-center justify-center py-20 bg-card border-border">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <p className="text-muted-foreground">لا توجد وحدات تعليمية بعد</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {units.map((unit) => {
              const expanded = expandedUnit === unit.id;
              const lessons = unit.lessons || [];
              const isEditing = editingUnitId === unit.id;

              return (
                <Card key={unit.id} className="bg-card border-border overflow-hidden">
                  {/* Unit header - view or edit mode */}
                  {isEditing ? (
                    <div className="p-4 space-y-3 border-b border-border">
                      <Input value={editUnitTitle} onChange={(e) => setEditUnitTitle(e.target.value)} autoFocus />
                      <Textarea value={editUnitDesc} onChange={(e) => setEditUnitDesc(e.target.value)} rows={2} placeholder="وصف (اختياري)" />
                      <div className="flex items-center gap-3">
                        <Select value={editUnitVis} onValueChange={setEditUnitVis}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل العملاء</SelectItem>
                            <SelectItem value="basic">Basic فقط</SelectItem>
                            <SelectItem value="pro">Pro فقط</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" onClick={() => setEditingUnitId(null)} className="gap-1.5">
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          إلغاء
                        </Button>
                        <Button size="sm" onClick={saveEditUnit} disabled={!editUnitTitle.trim()} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          حفظ
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); startEditUnit(unit); }}>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteUnit(unit.id); }}>
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  )}

                  {/* Expanded lessons */}
                  {expanded && !isEditing && (
                    <div className="border-t border-border bg-background/50 p-4 space-y-2">
                      {lessons.sort((a, b) => a.lesson_order - b.lesson_order).map((lesson, idx) => {
                        const Icon = contentTypeIcons[lesson.content_type] || FileText;
                        const isEditingThis = editingLessonId === lesson.id;

                        if (isEditingThis) {
                          return (
                            <div key={lesson.id}>
                              {renderLessonForm(
                                editLessonTitle, setEditLessonTitle,
                                editLessonType, setEditLessonType,
                                editLessonUrl, setEditLessonUrl,
                                editLessonText, setEditLessonText,
                                saveEditLesson,
                                () => setEditingLessonId(null),
                              )}
                            </div>
                          );
                        }

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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditLesson(lesson)}>
                              <Pencil className="h-3 w-3" strokeWidth={1.5} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLesson(lesson.id)}>
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            </Button>
                          </div>
                        );
                      })}

                      {/* Inline new lesson form */}
                      {newLessonUnitId === unit.id ? (
                        renderLessonForm(
                          newLessonTitle, setNewLessonTitle,
                          newLessonType, setNewLessonType,
                          newLessonUrl, setNewLessonUrl,
                          newLessonText, setNewLessonText,
                          saveNewLesson,
                          () => setNewLessonUnitId(null),
                        )
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-2 mt-2" onClick={() => startNewLesson(unit.id)}>
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                          إضافة درس
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Vault;
