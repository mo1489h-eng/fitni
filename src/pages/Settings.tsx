import { useState, useRef } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Lock, Loader2, Trash2, User } from "lucide-react";

const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { plan, hasReportsAccess } = usePlanLimits();
  const isPro = plan === "pro" || plan === "gym";
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const logoUrl = (profile as any)?.logo_url as string | null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logos/${user.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("progress-photos")
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ logo_url: urlData.publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "تم رفع الشعار بنجاح ✅" });
    } catch {
      toast({ title: "حدث خطأ في رفع الشعار", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ logo_url: null })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "تم حذف الشعار" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const planLabels: Record<string, string> = {
    free: "تجربة مجانية",
    basic: "أساسي",
    pro: "احترافي",
    gym: "جيم",
  };

  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">الإعدادات ⚙️</h1>

        {/* Profile Info */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-card-foreground">{profile?.full_name || "—"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">الباقة الحالية:</span>
            <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {planLabels[plan || "free"]}
            </span>
          </div>
        </Card>

        {/* Logo Upload */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-card-foreground">شعارك الخاص 🎨</h3>
            {!isPro && (
              <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                باقة احترافية
              </span>
            )}
          </div>

          {isPro ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ارفع شعارك ليظهر في بوابة العميل بدلاً من شعار fitni
              </p>

              {logoUrl ? (
                <div className="space-y-3">
                  <div className="w-24 h-24 rounded-xl border border-border overflow-hidden bg-secondary">
                    <img src={logoUrl} alt="شعار المدرب" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 ml-1" />
                      تغيير
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      disabled={uploading}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8" />
                      <span className="text-sm font-medium">اضغط لرفع الشعار</span>
                      <span className="text-xs">PNG, JPG — أقصى حجم 2MB</span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground">
                رفع الشعار الخاص متاح فقط في الباقة الاحترافية
              </p>
              <Button size="sm" onClick={() => setShowUpgrade(true)}>
                ترقية الآن
              </Button>
            </div>
          )}
        </Card>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          title="ميزة الباقة الاحترافية"
          description="رفع الشعار الخاص متاح فقط في الباقة الاحترافية وباقة الجيم"
          onUpgrade={() => {
            setShowUpgrade(false);
            setShowPlans(true);
          }}
        />
        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
      </div>
    </TrainerLayout>
  );
};

export default Settings;
