import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, ArrowRight, Video, FileText, Type, ChevronUp, ChevronDown,
  Pencil, Trash2, GripVertical, Save, X
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
  title: string;
  description: string | null;
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

const VaultUnit = () => {
  const { user } = useAuth();
  const { unitId } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<VaultUnit | null>(null);
  const [lessons, setLessons] = useState<VaultLesson[]>([]);
  const [loading, setLoading] = useState(true);

  // New lesson inline
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"video" | "pdf" | "article">("video");
  const [newUrl, setNewUrl] = useState("");
  const [newText, setNewText] = useState("");

  // Edit lesson
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<"video" | "pdf" | "article">("video");
  const [editUrl, setEditUrl] = useState("");
  const [editText, setEditText] = useState("");

  const fetchData = async () => {
    if (!user || !unitId) return;
    const [{ data: unitData }, { data: lessonsData }] = await Promise.all([
      supabase.from("vault_units").select("id, title, description").eq("id", unitId).eq("trainer_id", user.id).single(),
      supabase.from("vault_lessons").select("*").eq("unit_id", unitId).order("lesson_order"),
    ]);
    if (unitData) setUnit(unitData);
    setLessons((lessonsData || []) as VaultLesson[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, unitId]);

  const saveNewLesson = async () => {
    if (!unitId || !newTitle.trim()) return;
    await supabase.from("vault_lessons").insert({
      unit_id: unitId,
      title: newTitle.trim(),
      content_type: newType,
      content_url: newType !== "article" ? newUrl.trim() || null : null,
      content_text: newType === "article" ? newText : null,
      lesson_order: lessons.length,
    });
    toast.success("تم إضافة الدرس");
    setAdding(false);
    setNewTitle(""); setNewUrl(""); setNewText(""); setNewType("video");
    fetchData();
  };

  const startEditLesson = (l: VaultLesson) => {
    setEditId(l.id);
    setEditTitle(l.title);
    setEditType(l.content_type);
    setEditUrl(l.content_url || "");
    setEditText(l.content_text || "");
  };

  const saveEditLesson = async () => {
    if (!editId || !editTitle.trim()) return;
    await supabase.from("vault_lessons").update({
      title: editTitle.trim(),
      content_type: editType,
      content_url: editType !== "article" ? editUrl.trim() || null : null,
      content_text: editType === "article" ? editText : null,
    }).eq("id", editId);
    toast.success("تم تحديث الدرس");
    setEditId(null);
    fetchData();
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("vault_lessons").delete().eq("id", id);
    toast.success("تم حذف الدرس");
    fetchData();
  };

  const moveLesson = async (lesson: VaultLesson, dir: "up" | "down") => {
    const sorted = [...lessons].sort((a, b) => a.lesson_order - b.lesson_order);
    const idx = sorted.findIndex(l => l.id === lesson.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    await Promise.all([
      supabase.from("vault_lessons").update({ lesson_order: sorted[swapIdx].lesson_order }).eq("id", lesson.id),
      supabase.from("vault_lessons").update({ lesson_order: lesson.lesson_order }).eq("id", sorted[swapIdx].id),
    ]);
    fetchData();
  };

  const renderTypeToggle = (
    type: "video" | "pdf" | "article",
    setType: (v: "video" | "pdf" | "article") => void
  ) => (
    <div className="flex gap-1.5">
      {(["video", "pdf", "article"] as const).map(t => {
        const Icon = contentTypeIcons[t];
        const active = type === t;
        return (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(142_76%_36%/0.2)]"
                : "bg-[hsl(0_0%_10%)] text-[hsl(0_0%_45%)] hover:text-white hover:bg-[hsl(0_0%_14%)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {contentTypeLabels[t]}
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <TrainerLayout title="المكتبة التعليمية">
        <div className="text-center py-24 text-[hsl(0_0%_30%)]">جاري التحميل...</div>
      </TrainerLayout>
    );
  }

  if (!unit) {
    return (
      <TrainerLayout title="المكتبة التعليمية">
        <div className="text-center py-24 text-[hsl(0_0%_30%)]">الوحدة غير موجودة</div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout title="المكتبة التعليمية">
      <div className="space-y-6 max-w-3xl" dir="rtl">
        {/* Back + Header */}
        <div>
          <button
            onClick={() => navigate("/vault")}
            className="flex items-center gap-2 text-sm text-[hsl(0_0%_40%)] hover:text-white transition-colors mb-4"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            العودة للمكتبة
          </button>
          <h1 className="text-2xl font-bold text-white mb-1">{unit.title}</h1>
          {unit.description && (
            <p className="text-sm text-[hsl(0_0%_40%)]">{unit.description}</p>
          )}
        </div>

        {/* Lessons list */}
        <div className="space-y-2">
          {lessons.sort((a, b) => a.lesson_order - b.lesson_order).map((lesson, idx) => {
            const Icon = contentTypeIcons[lesson.content_type] || FileText;
            const isEditing = editId === lesson.id;

            if (isEditing) {
              return (
                <div key={lesson.id} className="rounded-xl border border-primary/30 bg-[hsl(0_0%_6%)] p-4 space-y-3">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                  {renderTypeToggle(editType, setEditType)}
                  {editType !== "article" && (
                    <Input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder={editType === "video" ? "رابط YouTube أو Vimeo" : "رابط ملف PDF أو Google Drive"}
                    />
                  )}
                  {editType === "article" && (
                    <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6} placeholder="محتوى المقالة" />
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditId(null)} className="gap-1.5">
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} /> إلغاء
                    </Button>
                    <Button size="sm" onClick={saveEditLesson} disabled={!editTitle.trim()} className="gap-1.5">
                      <Save className="h-3.5 w-3.5" strokeWidth={1.5} /> حفظ
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={lesson.id}
                className="flex items-center gap-3 rounded-xl border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_6%)] px-4 py-3 hover:border-[hsl(0_0%_15%)] transition-all group"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveLesson(lesson, "up")} disabled={idx === 0} className="text-[hsl(0_0%_30%)] hover:text-white disabled:opacity-20 transition-colors">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => moveLesson(lesson, "down")} disabled={idx === lessons.length - 1} className="text-[hsl(0_0%_30%)] hover:text-white disabled:opacity-20 transition-colors">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="h-8 w-8 rounded-lg bg-[hsl(0_0%_10%)] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{lesson.title}</p>
                  <p className="text-[10px] text-[hsl(0_0%_35%)]">{contentTypeLabels[lesson.content_type]}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditLesson(lesson)} className="h-7 w-7 rounded-lg hover:bg-[hsl(0_0%_12%)] flex items-center justify-center text-[hsl(0_0%_40%)] hover:text-white transition-colors">
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => deleteLesson(lesson.id)} className="h-7 w-7 rounded-lg hover:bg-[hsl(0_0%_12%)] flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline new lesson */}
        {adding ? (
          <div className="rounded-xl border border-primary/30 bg-[hsl(0_0%_6%)] p-4 space-y-3">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان الدرس" autoFocus />
            {renderTypeToggle(newType, setNewType)}
            {newType !== "article" && (
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={newType === "video" ? "رابط YouTube أو Vimeo" : "رابط ملف PDF أو Google Drive"}
              />
            )}
            {newType === "article" && (
              <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={6} placeholder="محتوى المقالة" />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="gap-1.5">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} /> إلغاء
              </Button>
              <Button size="sm" onClick={saveNewLesson} disabled={!newTitle.trim()} className="gap-1.5">
                <Save className="h-3.5 w-3.5" strokeWidth={1.5} /> حفظ
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-2 border-dashed border-[hsl(0_0%_15%)] text-[hsl(0_0%_40%)] hover:text-white hover:border-primary/30" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            إضافة درس
          </Button>
        )}
      </div>
    </TrainerLayout>
  );
};

export default VaultUnit;
