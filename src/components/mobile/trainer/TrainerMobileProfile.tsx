import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Loader2, Camera, Pencil, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface TrainerMobileProfileProps {
  onLogout: () => void;
}

const ACCENT = "#4f6f52";

const WEB_APP_ORIGIN = (import.meta.env.VITE_WEB_APP_ORIGIN as string | undefined)?.replace(/\/$/, "") || "https://coachbase.health";

const TrainerMobileProfile = ({ onLogout }: TrainerMobileProfileProps) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile, user, signOut, refreshProfile, loading } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const trainerName = profile?.full_name || "المدرب";
  const email = user?.email ?? "—";
  const roleLabel = "مدرب";
  const updateMutation = useMutation({
    mutationFn: async (payload: { full_name: string; avatar_url?: string | null }) => {
      if (!user) throw new Error("لا يوجد مستخدم");
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: ["trainer-dashboard", user.id] });
    },
  });

  const handleOpenEdit = () => {
    setName(profile?.full_name ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ full_name: trimmed });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("progress-photos").getPublicUrl(path);
      await updateMutation.mutateAsync({ full_name: profile?.full_name ?? trainerName, avatar_url: publicUrl });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
    navigate("/login", { replace: true });
  };

  if (loading && !profile) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin" style={{ color: ACCENT }} />
        <p className="text-sm text-muted-foreground">جاري تحميل الحساب…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="rounded-2xl bg-card p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-20 w-20 rounded-2xl object-cover"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold"
                style={{ background: "rgba(79,111,82,0.15)", color: ACCENT }}
              >
                {trainerName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              aria-label="تغيير الصورة"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card-hover shadow-lg"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-4 w-4 text-foreground" strokeWidth={1.5} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatar}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">{trainerName}</h2>
            <p className="mt-1 truncate text-xs text-muted-foreground" dir="ltr">
              {email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className="inline-block rounded-full px-3 py-1 text-[11px] font-medium"
                style={{ background: "rgba(79,111,82,0.12)", color: ACCENT }}
              >
                {roleLabel}
              </span>
              <span
                className="inline-block rounded-full px-3 py-1 text-[11px] font-medium"
                style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}
              >
                {planLabel}
              </span>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">عضو منذ {createdAt}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full border-border bg-muted/40 text-foreground hover:bg-muted"
          onClick={handleOpenEdit}
        >
          <Pencil className="ml-2 h-4 w-4" strokeWidth={1.5} />
          تعديل الملف الشخصي
        </Button>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-border bg-muted/40 text-foreground hover:bg-muted"
          onClick={() => window.open(WEB_APP_ORIGIN, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="ml-2 h-4 w-4" strokeWidth={1.5} />
          إدارة المنصة
        </Button>
      </motion.div>

      <div className="overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
          <User className="h-5 w-5 shrink-0 text-muted-foreground/80" strokeWidth={1.5} />
          <span>البيانات مأخوذة من جدول الملفات في Supabase ومتزامنة مع حسابك.</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98]"
        style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        تسجيل الخروج
      </button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الملف الشخصي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم</Label>
              <Input
                id="full_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border bg-background text-foreground"
                placeholder="اسمك الكامل"
              />
            </div>
            <p className="text-xs text-white/45">البريد: {email}</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-white/70">
              إلغاء
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerMobileProfile;
