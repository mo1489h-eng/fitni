import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { uploadImage, validateImageFile, compressImage } from "@/lib/image-upload";
import {
  Plus, BookOpen, Video, FileText, Type, Pencil, Trash2,
  Image as ImageIcon, Save, X, Lock, Clock, Layers, Eye
} from "lucide-react";

type VaultUnit = {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  unit_order: number;
  visibility: string;
  cover_image_url: string | null;
  lock_type: string;
  lock_days: number;
  lock_after_unit_id: string | null;
  created_at: string;
  lessons_count?: number;
};

const visibilityLabels: Record<string, string> = {
  all: "كل العملاء",
  basic: "Basic فقط",
  pro: "Pro فقط",
};

const lockLabels: Record<string, string> = {
  immediate: "متاح فوراً",
  days: "يُفتح بعد أيام",
  unit: "يُفتح بعد إكمال وحدة",
};

const defaultGradients = [
  "linear-gradient(135deg, hsl(125 18% 22%), hsl(125 18% 32%))",
  "linear-gradient(135deg, hsl(200 35% 18%), hsl(200 35% 28%))",
  "linear-gradient(135deg, hsl(220 12% 18%), hsl(220 12% 26%))",
  "linear-gradient(135deg, hsl(30 40% 18%), hsl(30 40% 28%))",
  "linear-gradient(135deg, hsl(340 25% 18%), hsl(340 25% 26%))",
];

const Vault = () => {
  usePageTitle("المكتبة التعليمية");
  useRegisterTrainerShell({ title: "المكتبة التعليمية" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<VaultUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline creation
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVis, setNewVis] = useState("all");
  const [newLock, setNewLock] = useState("immediate");
  const [newLockDays, setNewLockDays] = useState(7);
  const [newLockUnitId, setNewLockUnitId] = useState<string>("");
  const [newCoverUrl, setNewCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVis, setEditVis] = useState("all");
  const [editLock, setEditLock] = useState("immediate");
  const [editLockDays, setEditLockDays] = useState(7);
  const [editLockUnitId, setEditLockUnitId] = useState<string>("");
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const fetchUnits = async () => {
    if (!user) return;
    const { data: unitsData } = await supabase
      .from("vault_units")
      .select("*")
      .eq("trainer_id", user.id)
      .order("unit_order");

    if (!unitsData) { setLoading(false); return; }

    const unitIds = unitsData.map((u: any) => u.id);
    let lessonCounts: Record<string, number> = {};
    if (unitIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from("vault_lessons")
        .select("unit_id")
        .in("unit_id", unitIds);
      (lessonsData || []).forEach((l: any) => {
        lessonCounts[l.unit_id] = (lessonCounts[l.unit_id] || 0) + 1;
      });
    }

    setUnits(unitsData.map((u: any) => ({ ...u, lessons_count: lessonCounts[u.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, [user]);

  const handleCoverUpload = async (file: File, isEdit = false) => {
    if (!user) return;
    const error = validateImageFile(file);
    if (error) { toast.error(error); return; }
    setUploading(true);
    try {
      const result = await uploadImage(file, "fitproject", `vault-covers/${user.id}/${Date.now()}.jpg`);
      if (isEdit) setEditCoverUrl(result.signedUrl);
      else setNewCoverUrl(result.signedUrl);
    } catch (e: any) {
      toast.error(e.message || "خطأ في رفع الصورة");
    }
    setUploading(false);
  };

  const saveNew = async () => {
    if (!user || !newTitle.trim()) return;
    await supabase.from("vault_units").insert({
      trainer_id: user.id,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      visibility: newVis,
      unit_order: units.length,
      cover_image_url: newCoverUrl,
      lock_type: newLock,
      lock_days: newLock === "days" ? newLockDays : 0,
      lock_after_unit_id: newLock === "unit" && newLockUnitId ? newLockUnitId : null,
    });
    toast.success("تم إنشاء الوحدة");
    setCreating(false);
    setNewTitle(""); setNewDesc(""); setNewVis("all"); setNewLock("immediate");
    setNewCoverUrl(null);
    fetchUnits();
  };

  const startEdit = (u: VaultUnit) => {
    setEditId(u.id);
    setEditTitle(u.title);
    setEditDesc(u.description || "");
    setEditVis(u.visibility);
    setEditLock(u.lock_type || "immediate");
    setEditLockDays(u.lock_days || 7);
    setEditLockUnitId(u.lock_after_unit_id || "");
    setEditCoverUrl(u.cover_image_url);
  };

  const saveEdit = async () => {
    if (!editId || !editTitle.trim()) return;
    await supabase.from("vault_units").update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      visibility: editVis,
      cover_image_url: editCoverUrl,
      lock_type: editLock,
      lock_days: editLock === "days" ? editLockDays : 0,
      lock_after_unit_id: editLock === "unit" && editLockUnitId ? editLockUnitId : null,
    }).eq("id", editId);
    toast.success("تم تحديث الوحدة");
    setEditId(null);
    fetchUnits();
  };

  const deleteUnit = async (id: string) => {
    await supabase.from("vault_units").delete().eq("id", id);
    toast.success("تم حذف الوحدة");
    fetchUnits();
  };

  const renderUnitCard = (unit: VaultUnit) => {
    const isEditing = editId === unit.id;
    const gradient = defaultGradients[unit.unit_order % defaultGradients.length];

    if (isEditing) {
      return (
        <div key={unit.id} className="rounded-2xl border border-primary/30 bg-[hsl(0_0%_6%)] overflow-hidden">
          {/* Cover */}
          <div
            className="h-36 relative cursor-pointer group"
            style={editCoverUrl ? { backgroundImage: `url(${editCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: gradient }}
            onClick={() => editFileRef.current?.click()}
          >
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ImageIcon className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0], true)} />
          </div>
          <div className="p-4 space-y-3">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="عنوان الوحدة" autoFocus />
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="وصف (اختياري)" rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={editVis} onValueChange={setEditVis}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العملاء</SelectItem>
                  <SelectItem value="basic">Basic فقط</SelectItem>
                  <SelectItem value="pro">Pro فقط</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editLock} onValueChange={setEditLock}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">متاح فوراً</SelectItem>
                  <SelectItem value="days">بعد أيام</SelectItem>
                  <SelectItem value="unit">بعد وحدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editLock === "days" && (
              <Input type="number" value={editLockDays} onChange={(e) => setEditLockDays(Number(e.target.value))} placeholder="عدد الأيام" min={1} />
            )}
            {editLock === "unit" && (
              <Select value={editLockUnitId} onValueChange={setEditLockUnitId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر الوحدة السابقة" /></SelectTrigger>
                <SelectContent>
                  {units.filter(u => u.id !== editId).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim()} className="flex-1 gap-1.5">
                <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                حفظ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="gap-1.5">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={unit.id}
        className="rounded-2xl border border-[hsl(0_0%_10%)] bg-[hsl(0_0%_6%)] overflow-hidden group cursor-pointer hover:border-[hsl(0_0%_15%)] transition-all duration-300"
        onClick={() => navigate(`/vault/${unit.id}`)}
      >
        {/* Cover */}
        <div
          className="h-36 relative"
          style={unit.cover_image_url ? { backgroundImage: `url(${unit.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: gradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0_0%_4%)] via-transparent to-transparent" />
          {/* Hover actions */}
          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(unit); }}
              className="h-7 w-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteUnit(unit.id); }}
              className="h-7 w-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-red-400 hover:bg-black/80 transition-colors"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
          {/* Badges */}
          <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/90 text-white font-medium">
              {visibilityLabels[unit.visibility]}
            </span>
            {unit.lock_type !== "immediate" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white/80 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" strokeWidth={1.5} />
                {unit.lock_type === "days" ? `${unit.lock_days} يوم` : "مشروط"}
              </span>
            )}
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-white text-sm mb-1 truncate">{unit.title}</h3>
          {unit.description && (
            <p className="text-xs text-[hsl(0_0%_40%)] mb-3 line-clamp-2">{unit.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[hsl(0_0%_40%)] flex items-center gap-1">
              <Layers className="h-3 w-3" strokeWidth={1.5} />
              {unit.lessons_count || 0} درس
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="space-y-8" dir="rtl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">المكتبة التعليمية</h1>
            <p className="text-sm text-[hsl(0_0%_40%)]">أنشئ محتوى تعليمياً احترافياً لعملائك</p>
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              إضافة وحدة
            </Button>
          )}
        </div>

        {/* New unit inline */}
        {creating && (
          <div className="rounded-2xl border border-primary/30 bg-[hsl(0_0%_6%)] overflow-hidden max-w-md">
            <div
              className="h-36 relative cursor-pointer group"
              style={newCoverUrl ? { backgroundImage: `url(${newCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: defaultGradients[units.length % defaultGradients.length] }}
              onClick={() => fileRef.current?.click()}
            >
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon className="h-6 w-6 text-white mb-1" strokeWidth={1.5} />
                <span className="text-xs text-white/80">رفع صورة الغلاف</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
            </div>
            <div className="p-4 space-y-3">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان الوحدة" autoFocus />
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="وصف الوحدة (اختياري)" rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newVis} onValueChange={setNewVis}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل العملاء</SelectItem>
                    <SelectItem value="basic">Basic فقط</SelectItem>
                    <SelectItem value="pro">Pro فقط</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newLock} onValueChange={setNewLock}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">متاح فوراً</SelectItem>
                    <SelectItem value="days">بعد أيام</SelectItem>
                    <SelectItem value="unit">بعد وحدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newLock === "days" && (
                <Input type="number" value={newLockDays} onChange={(e) => setNewLockDays(Number(e.target.value))} placeholder="عدد الأيام" min={1} />
              )}
              {newLock === "unit" && units.length > 0 && (
                <Select value={newLockUnitId} onValueChange={setNewLockUnitId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر الوحدة السابقة" /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNew} disabled={!newTitle.trim() || uploading} className="flex-1 gap-1.5">
                  <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {uploading ? "جاري الرفع..." : "حفظ"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewCoverUrl(null); }} className="gap-1.5">
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="text-center py-24 text-[hsl(0_0%_30%)]">جاري التحميل...</div>
        ) : units.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-20 w-20 rounded-2xl bg-[hsl(0_0%_8%)] border border-[hsl(0_0%_12%)] flex items-center justify-center mb-5">
              <BookOpen className="h-9 w-9 text-[hsl(0_0%_25%)]" strokeWidth={1.5} />
            </div>
            <p className="text-white font-bold text-lg mb-1">لا توجد وحدات تعليمية بعد</p>
            <p className="text-sm text-[hsl(0_0%_35%)] mb-6">ابدأ بإنشاء أول وحدة تعليمية لعملائك</p>
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              إضافة وحدة
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(renderUnitCard)}
          </div>
        )}
      </div>
  );
};

export default Vault;
