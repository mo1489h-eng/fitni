import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus, ArrowRight, Video, FileText, Type, ChevronUp, ChevronDown,
  Pencil, Trash2, GripVertical, Save, X, Upload, Image as ImageIcon, Link2, Loader2,
} from "lucide-react";
import {
  uploadVaultLessonFile,
  isVideoEmbedUrl,
  validateVaultFile,
} from "@/lib/vaultUpload";

type VaultLesson = {
  id: string;
  unit_id: string;
  title: string;
  content_type: "video" | "pdf" | "article" | "image";
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  video_url: string | null;
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
  image: "صورة",
};

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  article: Type,
  image: ImageIcon,
};

function LessonFileDropZone({
  accept,
  label,
  disabled,
  onFile,
}: {
  accept: string;
  label: string;
  disabled?: boolean;
  onFile: (f: File) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (disabled) return;
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [disabled, onFile],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`rounded-lg border border-dashed px-3 py-4 text-center transition-colors ${
        drag ? "border-primary bg-primary/10" : "border-[hsl(0_0%_18%)] bg-[hsl(0_0%_8%)]"
      } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Upload className="h-5 w-5 mx-auto mb-1 text-[hsl(0_0%_40%)]" strokeWidth={1.5} />
      <p className="text-[11px] text-[hsl(0_0%_45%)]">{label}</p>
    </div>
  );
}

const VaultUnitPage = () => {
  const { user } = useAuth();
  const { unitId } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<VaultUnit | null>(null);
  const [lessons, setLessons] = useState<VaultLesson[]>([]);
  const [loading, setLoading] = useState(true);

  usePageTitle(unit?.title ?? "وحدة المكتبة");
  useRegisterTrainerShell({ title: unit?.title ?? "المكتبة التعليمية" });

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"video" | "pdf" | "article" | "image">("video");
  const [newUrl, setNewUrl] = useState("");
  const [newText, setNewText] = useState("");
  const [newVideoMode, setNewVideoMode] = useState<"url" | "file">("url");
  const [newFileUrl, setNewFileUrl] = useState<string | null>(null);
  const [newFileType, setNewFileType] = useState<string | null>(null);
  const [newFileSize, setNewFileSize] = useState<number | null>(null);
  const [newUploading, setNewUploading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<"video" | "pdf" | "article" | "image">("video");
  const [editUrl, setEditUrl] = useState("");
  const [editText, setEditText] = useState("");
  const [editVideoMode, setEditVideoMode] = useState<"url" | "file">("url");
  const [editFileUrl, setEditFileUrl] = useState<string | null>(null);
  const [editFileType, setEditFileType] = useState<string | null>(null);
  const [editFileSize, setEditFileSize] = useState<number | null>(null);
  const [editUploading, setEditUploading] = useState(false);

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

  const uploadForLesson = async (file: File, kind: "pdf" | "video" | "image") => {
    if (!user?.id || !unitId) return null;
    return uploadVaultLessonFile(file, user.id, unitId, kind);
  };

  const buildLessonPayload = (
    type: "video" | "pdf" | "article" | "image",
    url: string,
    text: string,
    videoMode: "url" | "file",
    fileUrl: string | null,
    fileType: string | null,
    fileSize: number | null,
  ) => {
    let content_url: string | null = null;
    let content_text: string | null = null;
    let fUrl: string | null = fileUrl;
    let fType: string | null = fileType;
    let fSize: number | null = fileSize;
    let vUrl: string | null = null;

    if (type === "article") {
      content_text = text;
      fUrl = null;
      fType = null;
      fSize = null;
      vUrl = null;
    } else if (type === "video") {
      if (videoMode === "url") {
        vUrl = url.trim() || null;
        content_url = vUrl;
        fUrl = null;
        fType = vUrl ? "video_url" : null;
        fSize = null;
      } else {
        content_url = fUrl;
        fType = fUrl ? "video" : null;
      }
    } else if (type === "pdf") {
      content_url = fUrl || (url.trim() || null);
      fUrl = fUrl || null;
      fType = fUrl ? "pdf" : url.trim() ? "pdf" : null;
      if (!fSize && url.trim()) fSize = null;
    } else if (type === "image") {
      content_url = fUrl || null;
      fType = fUrl ? "image" : null;
    }

    return {
      content_type: type,
      content_url,
      content_text,
      file_url: fUrl,
      file_type: fType,
      file_size: fSize,
      video_url: type === "video" && videoMode === "url" ? vUrl : null,
    };
  };

  const saveNewLesson = async () => {
    if (!unitId || !newTitle.trim() || !user) return;
    if (newType === "video" && newVideoMode === "url" && !newUrl.trim()) {
      toast.error("أدخل رابط الفيديو");
      return;
    }
    if (newType === "video" && newVideoMode === "file" && !newFileUrl) {
      toast.error("ارفع ملف الفيديو أو اختر رابطاً");
      return;
    }
    if (newType === "pdf" && !newFileUrl && !newUrl.trim()) {
      toast.error("ارفع PDF أو أدخل رابطاً");
      return;
    }
    if (newType === "image" && !newFileUrl) {
      toast.error("ارفع صورة");
      return;
    }
    const payload = buildLessonPayload(
      newType,
      newUrl,
      newText,
      newVideoMode,
      newFileUrl,
      newFileType,
      newFileSize,
    );
    await supabase.from("vault_lessons").insert({
      unit_id: unitId,
      title: newTitle.trim(),
      lesson_order: lessons.length,
      ...payload,
    });
    toast.success("تم إضافة الدرس");
    setAdding(false);
    setNewTitle("");
    setNewUrl("");
    setNewText("");
    setNewType("video");
    setNewVideoMode("url");
    setNewFileUrl(null);
    setNewFileType(null);
    setNewFileSize(null);
    fetchData();
  };

  const startEditLesson = (l: VaultLesson) => {
    setEditId(l.id);
    setEditTitle(l.title);
    setEditType(l.content_type);
    setEditText(l.content_text || "");
    const isEmbed = l.file_type === "video_url" || (!!l.video_url || (!!l.content_url && isVideoEmbedUrl(l.content_url || "")));
    if (l.content_type === "video") {
      if (isEmbed) {
        setEditVideoMode("url");
        setEditUrl(l.video_url || l.content_url || "");
        setEditFileUrl(null);
        setEditFileType(null);
        setEditFileSize(null);
      } else {
        setEditVideoMode("file");
        setEditUrl("");
        setEditFileUrl(l.file_url || l.content_url);
        setEditFileType(l.file_type || "video");
        setEditFileSize(l.file_size);
      }
    } else if (l.content_type === "pdf") {
      setEditUrl(l.file_url ? "" : (l.content_url || ""));
      setEditFileUrl(l.file_url);
      setEditFileType(l.file_type);
      setEditFileSize(l.file_size);
    } else if (l.content_type === "image") {
      setEditUrl("");
      setEditFileUrl(l.file_url || l.content_url);
      setEditFileType(l.file_type || "image");
      setEditFileSize(l.file_size);
    } else {
      setEditUrl("");
    }
  };

  const saveEditLesson = async () => {
    if (!editId || !editTitle.trim() || !user) return;
    if (editType === "video" && editVideoMode === "url" && !editUrl.trim()) {
      toast.error("أدخل رابط الفيديو");
      return;
    }
    if (editType === "video" && editVideoMode === "file" && !editFileUrl) {
      toast.error("ارفع ملف الفيديو أو اختر رابطاً");
      return;
    }
    if (editType === "pdf" && !editFileUrl && !editUrl.trim()) {
      toast.error("ارفع PDF أو أدخل رابطاً");
      return;
    }
    if (editType === "image" && !editFileUrl) {
      toast.error("ارفع صورة");
      return;
    }
    const payload = buildLessonPayload(
      editType,
      editUrl,
      editText,
      editVideoMode,
      editFileUrl,
      editFileType,
      editFileSize,
    );
    await supabase.from("vault_lessons").update({
      title: editTitle.trim(),
      ...payload,
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
    type: typeof newType,
    setType: (v: typeof newType) => void,
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {(["video", "pdf", "article", "image"] as const).map(t => {
        const Icon = contentTypeIcons[t];
        const active = type === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-none"
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

  const renderNewMediaFields = () => {
    if (newType === "article") {
      return (
        <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={6} placeholder="محتوى المقالة" />
      );
    }
    if (newType === "video") {
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={newVideoMode === "url" ? "default" : "outline"}
              className="flex-1 gap-1 text-xs"
              onClick={() => setNewVideoMode("url")}
            >
              <Link2 className="h-3 w-3" />
              رابط YouTube / Vimeo
            </Button>
            <Button
              type="button"
              size="sm"
              variant={newVideoMode === "file" ? "default" : "outline"}
              className="flex-1 gap-1 text-xs"
              onClick={() => setNewVideoMode("file")}
            >
              <Upload className="h-3 w-3" />
              رفع فيديو
            </Button>
          </div>
          {newVideoMode === "url" ? (
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
            />
          ) : (
            <>
              <LessonFileDropZone
                accept="video/*"
                label="اسحب ملف الفيديو أو انقر — حتى 500 ميجابايت"
                disabled={newUploading}
                onFile={async (f) => {
                  const err = validateVaultFile(f, "video");
                  if (err) { toast.error(err); return; }
                  setNewUploading(true);
                  try {
                    const r = await uploadForLesson(f, "video");
                    if (r) {
                      setNewFileUrl(r.publicUrl);
                      setNewFileType("video");
                      setNewFileSize(r.fileSize);
                    }
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "فشل الرفع");
                  }
                  setNewUploading(false);
                }}
              />
              {newUploading && (
                <p className="text-xs text-[hsl(0_0%_45%)] flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الرفع...
                </p>
              )}
              {newFileUrl && !newUploading && (
                <div className="rounded-lg overflow-hidden border border-[hsl(0_0%_12%)] bg-black aspect-video">
                  <video src={newFileUrl} controls className="w-full h-full" />
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    if (newType === "pdf") {
      return (
        <div className="space-y-3">
          <LessonFileDropZone
            accept="application/pdf"
            label="اسحب PDF أو انقر — حتى 50 ميجابايت"
            disabled={newUploading}
            onFile={async (f) => {
              const err = validateVaultFile(f, "pdf");
              if (err) { toast.error(err); return; }
              setNewUploading(true);
              try {
                const r = await uploadForLesson(f, "pdf");
                if (r) {
                  setNewFileUrl(r.publicUrl);
                  setNewFileType("pdf");
                  setNewFileSize(r.fileSize);
                }
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "فشل الرفع");
              }
              setNewUploading(false);
            }}
          />
          {newUploading && (
            <p className="text-xs text-[hsl(0_0%_45%)] flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الرفع...
            </p>
          )}
          <p className="text-[10px] text-[hsl(0_0%_40%)]">أو أدخل رابط PDF خارجي</p>
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." dir="ltr" />
          {newFileUrl && !newUploading && (
            <div className="rounded-lg overflow-hidden border border-[hsl(0_0%_12%)] h-48 bg-[hsl(0_0%_8%)]">
              <iframe title="pdf-preview" src={newFileUrl} className="w-full h-full" />
            </div>
          )}
        </div>
      );
    }
    /* image */
    return (
      <div className="space-y-3">
        <LessonFileDropZone
          accept="image/*"
          label="اسحب صورة أو انقر — حتى 10 ميجابايت"
          disabled={newUploading}
          onFile={async (f) => {
            const err = validateVaultFile(f, "image");
            if (err) { toast.error(err); return; }
            setNewUploading(true);
            try {
              const r = await uploadForLesson(f, "image");
              if (r) {
                setNewFileUrl(r.publicUrl);
                setNewFileType("image");
                setNewFileSize(r.fileSize);
              }
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "فشل الرفع");
            }
            setNewUploading(false);
          }}
        />
        {newUploading && (
          <p className="text-xs text-[hsl(0_0%_45%)] flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الرفع...
          </p>
        )}
        {newFileUrl && !newUploading && (
          <img src={newFileUrl} alt="" className="max-h-48 rounded-lg border border-[hsl(0_0%_12%)] mx-auto" />
        )}
      </div>
    );
  };

  const renderEditMediaFields = () => {
    if (editType === "article") {
      return (
        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={6} placeholder="محتوى المقالة" />
      );
    }
    if (editType === "video") {
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={editVideoMode === "url" ? "default" : "outline"}
              className="flex-1 gap-1 text-xs"
              onClick={() => setEditVideoMode("url")}
            >
              <Link2 className="h-3 w-3" />
              رابط
            </Button>
            <Button
              type="button"
              size="sm"
              variant={editVideoMode === "file" ? "default" : "outline"}
              className="flex-1 gap-1 text-xs"
              onClick={() => setEditVideoMode("file")}
            >
              <Upload className="h-3 w-3" />
              رفع
            </Button>
          </div>
          {editVideoMode === "url" ? (
            <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." dir="ltr" />
          ) : (
            <>
              <LessonFileDropZone
                accept="video/*"
                label="استبدال ملف الفيديو (اختياري)"
                disabled={editUploading}
                onFile={async (f) => {
                  const err = validateVaultFile(f, "video");
                  if (err) { toast.error(err); return; }
                  setEditUploading(true);
                  try {
                    const r = await uploadForLesson(f, "video");
                    if (r) {
                      setEditFileUrl(r.publicUrl);
                      setEditFileType("video");
                      setEditFileSize(r.fileSize);
                    }
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "فشل الرفع");
                  }
                  setEditUploading(false);
                }}
              />
              {editUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editFileUrl && (
                <div className="rounded-lg overflow-hidden border border-[hsl(0_0%_12%)] bg-black aspect-video">
                  <video src={editFileUrl} controls className="w-full h-full" />
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    if (editType === "pdf") {
      return (
        <div className="space-y-3">
          <LessonFileDropZone
            accept="application/pdf"
            label="استبدال PDF"
            disabled={editUploading}
            onFile={async (f) => {
              const err = validateVaultFile(f, "pdf");
              if (err) { toast.error(err); return; }
              setEditUploading(true);
              try {
                const r = await uploadForLesson(f, "pdf");
                if (r) {
                  setEditFileUrl(r.publicUrl);
                  setEditFileType("pdf");
                  setEditFileSize(r.fileSize);
                }
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : "فشل الرفع");
              }
              setEditUploading(false);
            }}
          />
          <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="أو رابط PDF" dir="ltr" />
          {editFileUrl && (
            <div className="rounded-lg overflow-hidden border border-[hsl(0_0%_12%)] h-40 bg-[hsl(0_0%_8%)]">
              <iframe title="pdf-edit" src={editFileUrl} className="w-full h-full" />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <LessonFileDropZone
          accept="image/*"
          label="استبدال الصورة"
          disabled={editUploading}
          onFile={async (f) => {
            const err = validateVaultFile(f, "image");
            if (err) { toast.error(err); return; }
            setEditUploading(true);
            try {
              const r = await uploadForLesson(f, "image");
              if (r) {
                setEditFileUrl(r.publicUrl);
                setEditFileType("image");
                setEditFileSize(r.fileSize);
              }
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "فشل الرفع");
            }
            setEditUploading(false);
          }}
        />
        {editFileUrl && (
          <img src={editFileUrl} alt="" className="max-h-40 rounded-lg border border-[hsl(0_0%_12%)] mx-auto" />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-[hsl(0_0%_30%)]">جاري التحميل...</div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-24 text-[hsl(0_0%_30%)]">الوحدة غير موجودة</div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <button
          type="button"
          onClick={() => navigate("/coach/vault")}
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

      <div className="space-y-2">
        {lessons.sort((a, b) => a.lesson_order - b.lesson_order).map((lesson, idx) => {
          const Icon = contentTypeIcons[lesson.content_type] || FileText;
          const isEditing = editId === lesson.id;

          if (isEditing) {
            return (
              <div key={lesson.id} className="rounded-xl border border-primary/30 bg-[hsl(0_0%_6%)] p-4 space-y-3">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                {renderTypeToggle(editType, setEditType)}
                {renderEditMediaFields()}
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditId(null)} className="gap-1.5">
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} /> إلغاء
                  </Button>
                  <Button size="sm" onClick={saveEditLesson} disabled={!editTitle.trim() || editUploading} className="gap-1.5">
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
                <button type="button" onClick={() => moveLesson(lesson, "up")} disabled={idx === 0} className="text-[hsl(0_0%_30%)] hover:text-white disabled:opacity-20 transition-colors">
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => moveLesson(lesson, "down")} disabled={idx === lessons.length - 1} className="text-[hsl(0_0%_30%)] hover:text-white disabled:opacity-20 transition-colors">
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
                <button type="button" onClick={() => startEditLesson(lesson)} className="h-7 w-7 rounded-lg hover:bg-[hsl(0_0%_12%)] flex items-center justify-center text-[hsl(0_0%_40%)] hover:text-white transition-colors">
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                </button>
                <button type="button" onClick={() => deleteLesson(lesson.id)} className="h-7 w-7 rounded-lg hover:bg-[hsl(0_0%_12%)] flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="rounded-xl border border-primary/30 bg-[hsl(0_0%_6%)] p-4 space-y-3">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان الدرس" autoFocus />
          {renderTypeToggle(newType, setNewType)}
          {renderNewMediaFields()}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)} className="gap-1.5">
              <X className="h-3.5 w-3.5" strokeWidth={1.5} /> إلغاء
            </Button>
            <Button size="sm" onClick={saveNewLesson} disabled={!newTitle.trim() || newUploading} className="gap-1.5">
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
  );
};

export default VaultUnitPage;
