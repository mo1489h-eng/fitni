import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Lock, Loader2, Trash2, User, Bell, Palette, Shield,
   LogOut, CreditCard, KeyRound, Save, CheckCircle, Globe, MapPin,
   RotateCcw, Banknote, Share2, Copy, Link, Instagram, Twitter, Plus, X, Image, MessageCircle,
} from "lucide-react";
import { useTutorial } from "@/hooks/useTutorial";
import { Badge } from "@/components/ui/badge";

const SPECIALIZATIONS = [
  "لياقة عامة",
  "كمال أجسام",
  "تخسيس",
  "تأهيل",
  "رياضات قتالية",
  "أخرى",
];

const Settings = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { plan } = usePlanLimits();
  const isPro = plan === "pro";
  const { toast } = useToast();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingDiscovery, setSavingDiscovery] = useState(false);
  const { startTutorial } = useTutorial();
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    iban: "",
    bank_name: "",
    account_holder_name: "",
  });
  const [usernameForm, setUsernameForm] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [personalPageForm, setPersonalPageForm] = useState({
    title: "",
    social_instagram: "",
    social_twitter: "",
    social_tiktok: "",
  });
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [savingPersonalPage, setSavingPersonalPage] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [discovery, setDiscovery] = useState({
    is_discoverable: false,
    city: "",
    price_range_min: 0,
    price_range_max: 500,
    specialties: [] as string[],
    training_modes: ["online"] as string[],
    trial_sessions: false,
  });

  const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "تبوك", "حائل", "جازان", "أخرى"];
  const TRAINING_MODES_OPTIONS = [
    { value: "online", label: "أونلاين" },
    { value: "in_person", label: "حضوري" },
    { value: "hybrid", label: "مدمج" },
  ];
  const SPECIALTIES_OPTIONS = ["لياقة عامة", "كمال أجسام", "تخسيس", "تأهيل", "رياضات قتالية", "يوغا", "كروس فت", "تغذية رياضية"];

  const avatarRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    specialization: "",
    bio: "",
    notify_inactive: true,
    notify_payments: true,
    notify_weekly_report: false,
    brand_color: "#16a34a",
    welcome_message: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        specialization: profile.specialization || "",
        bio: profile.bio || "",
        notify_inactive: profile.notify_inactive ?? true,
        notify_payments: profile.notify_payments ?? true,
        notify_weekly_report: profile.notify_weekly_report ?? false,
        brand_color: profile.brand_color || "#16a34a",
        welcome_message: profile.welcome_message || "",
      });
    }
  }, [profile]);

  // Fetch discovery profile & payment settings
  useEffect(() => {
    if (!user) return;
    const fetchDiscovery = async () => {
      const { data } = await supabase
        .from("trainer_discovery_profiles")
        .select("*")
        .eq("trainer_id", user.id)
        .maybeSingle();
      if (data) {
        setDiscovery({
          is_discoverable: data.is_discoverable,
          city: data.city || "",
          price_range_min: data.price_range_min || 0,
          price_range_max: data.price_range_max || 500,
          specialties: (data.specialties as string[]) || [],
          training_modes: (data.training_modes as string[]) || ["online"],
          trial_sessions: data.trial_sessions || false,
        });
      }
    };
    const fetchPaymentSettings = async () => {
      const { data } = await supabase
        .from("trainer_payment_settings")
        .select("*")
        .eq("trainer_id", user.id)
        .maybeSingle();
      if (data) {
        setPaymentForm({
          iban: data.iban || "",
          bank_name: data.bank_name || "",
          account_holder_name: data.account_holder_name || "",
        });
      }
    };
    fetchDiscovery();
    fetchPaymentSettings();
    setUsernameForm(profile?.username || "");

    // Fetch personal page data
    const fetchPersonalPage = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("title, social_links, gallery_images")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const links = (data as any).social_links || {};
        setPersonalPageForm({
          title: (data as any).title || "",
          social_instagram: links.instagram || "",
          social_twitter: links.twitter || "",
          social_tiktok: links.tiktok || "",
        });
        setGalleryImages((data as any).gallery_images || []);
      }
    };
    fetchPersonalPage();
  }, [user]);

  const handleSaveDiscovery = async () => {
    if (!user) return;
    setSavingDiscovery(true);
    try {
      const payload = {
        trainer_id: user.id,
        is_discoverable: discovery.is_discoverable,
        city: discovery.city,
        price_range_min: discovery.price_range_min,
        price_range_max: discovery.price_range_max,
        specialties: discovery.specialties,
        training_modes: discovery.training_modes,
        trial_sessions: discovery.trial_sessions,
      };
      const { data: existing } = await supabase
        .from("trainer_discovery_profiles")
        .select("id")
        .eq("trainer_id", user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("trainer_discovery_profiles")
          .update(payload)
          .eq("trainer_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trainer_discovery_profiles")
          .insert(payload);
        if (error) throw error;
      }
      toast({ title: "تم حفظ ملف الاكتشاف" });
    } catch {
      toast({ title: "حدث خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSavingDiscovery(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          specialization: form.specialization,
          bio: form.bio.trim(),
          notify_inactive: form.notify_inactive,
          notify_payments: form.notify_payments,
          notify_weekly_report: form.notify_weekly_report,
          brand_color: form.brand_color,
          welcome_message: form.welcome_message.trim(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "تم حفظ التغييرات" });
    } catch {
      toast({ title: "حدث خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    file: File,
    folder: string,
    column: string,
    setLoading: (v: boolean) => void
  ) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 2MB", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${folder}/${user.id}/img.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Create a long-lived signed URL for profile images
      const { data: signedData } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [column]: signedData?.signedUrl || path })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch {
      toast({ title: "حدث خطأ في رفع الصورة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (column: string) => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ [column]: null }).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "تم الحذف" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
    } catch {
      toast({ title: "حدث خطأ في تغيير كلمة المرور", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const planLabels: Record<string, string> = {
    free: "مجاني (سنة كاملة)",
    basic: "أساسي",
    pro: "احترافي",
  };

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    basic: "bg-primary/10 text-primary",
    pro: "bg-accent text-accent-foreground",
  };

  return (
    <TrainerLayout>
      <div className="space-y-6 animate-fade-in pb-8">
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>

        {/* ━━━ 1. PROFILE ━━━ */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">الملف الشخصي</h2>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="صورة شخصية"
                  className="w-20 h-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                  <User className="w-8 h-8 text-primary" />
                </div>
              )}
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">صورة الملف الشخصي</p>
              <p className="text-xs text-muted-foreground">PNG, JPG — أقصى 2MB</p>
              {profile?.avatar_url && (
                <button
                  onClick={() => handleDeleteImage("avatar_url")}
                  className="text-xs text-destructive mt-1 hover:underline"
                >
                  حذف الصورة
                </button>
              )}
            </div>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f, "avatars", "avatar_url", setUploadingAvatar);
            }}
          />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">الاسم الكامل</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="اسمك الكامل"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">رقم الجوال</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05XXXXXXXX"
                type="tel"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">التخصص</label>
              <Select
                value={form.specialization}
                onValueChange={(v) => setForm({ ...form, specialization: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تخصصك" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">نبذة عنك</label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="اكتب نبذة قصيرة عنك وعن خبرتك..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
                {form.bio.length}/500
              </p>
            </div>
          </div>
        </Card>

        {/* ━━━ 2. NOTIFICATIONS ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">الإشعارات</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">تذكير عملاء غير نشطين</p>
                <p className="text-xs text-muted-foreground">إشعار عند عدم تسجيل تمارين لأكثر من 5 أيام</p>
              </div>
              <Switch
                checked={form.notify_inactive}
                onCheckedChange={(v) => setForm({ ...form, notify_inactive: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">تنبيه مدفوعات متأخرة</p>
                <p className="text-xs text-muted-foreground">إشعار عند تأخر الاشتراكات</p>
              </div>
              <Switch
                checked={form.notify_payments}
                onCheckedChange={(v) => setForm({ ...form, notify_payments: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-card-foreground">تقرير أسبوعي تلقائي</p>
                <p className="text-xs text-muted-foreground">استلام ملخص أسبوعي عن أداء العملاء</p>
              </div>
              <Switch
                checked={form.notify_weekly_report}
                onCheckedChange={(v) => setForm({ ...form, notify_weekly_report: v })}
              />
            </div>
          </div>
        </Card>

        {/* ━━━ 3. BRANDING ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">العلامة التجارية</h2>
            </div>
            {!isPro && (
              <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                احترافي
              </span>
            )}
          </div>

          {isPro ? (
            <div className="space-y-5">
              {/* Logo */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">شعارك الخاص</label>
                <p className="text-xs text-muted-foreground mb-3">
                  يظهر في بوابة العميل بدلاً من شعار fitni
                </p>
                {profile?.logo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-secondary">
                      <img src={profile.logo_url} alt="شعار" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}>
                        <Camera className="w-4 h-4 ml-1" />
                        تغيير
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteImage("logo_url")}>
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={uploadingLogo}
                    className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6" />
                        <span className="text-sm">اضغط لرفع الشعار</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, "logos", "logo_url", setUploadingLogo);
                  }}
                />
              </div>

              <Separator />

              {/* Color Picker */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">لون منصتك الخاص</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input
                    value={form.brand_color}
                    onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                    dir="ltr"
                    className="w-32 font-mono text-sm"
                    maxLength={7}
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: form.brand_color }}
                  />
                </div>
              </div>

              <Separator />

              {/* Welcome Message */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">رسالة ترحيب للمتدربين</label>
                <Textarea
                  value={form.welcome_message}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="مثال: أهلاً بك في برنامجك التدريبي! 💪"
                  rows={2}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
                  {form.welcome_message.length}/200
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground">
                العلامة التجارية المخصصة متاحة فقط في الباقة الاحترافية
              </p>
              <Button size="sm" onClick={() => setShowUpgrade(true)}>
                ترقية الآن
              </Button>
            </div>
          )}
        </Card>

        {/* ━━━ 4. DISCOVERY PROFILE ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">ملف الاكتشاف</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            فعّل ظهورك في محرك البحث ليجدك العملاء المحتملون
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">الظهور في محرك البحث</p>
              <p className="text-xs text-muted-foreground">يمكن للعملاء إيجادك عبر صفحة الاكتشاف</p>
            </div>
            <Switch
              checked={discovery.is_discoverable}
              onCheckedChange={(v) => setDiscovery({ ...discovery, is_discoverable: v })}
            />
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-foreground">المدينة</label>
            <Select value={discovery.city} onValueChange={(v) => setDiscovery({ ...discovery, city: v })}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مدينتك" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">أقل سعر (ر.س/شهر)</label>
              <Input
                type="number"
                value={discovery.price_range_min}
                onChange={(e) => setDiscovery({ ...discovery, price_range_min: +e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">أعلى سعر (ر.س/شهر)</label>
              <Input
                type="number"
                value={discovery.price_range_max}
                onChange={(e) => setDiscovery({ ...discovery, price_range_max: +e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">التخصصات</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const has = discovery.specialties.includes(s);
                    setDiscovery({
                      ...discovery,
                      specialties: has
                        ? discovery.specialties.filter((x) => x !== s)
                        : [...discovery.specialties, s],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    discovery.specialties.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">طريقة التدريب</label>
            <div className="flex flex-wrap gap-2">
              {TRAINING_MODES_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    const has = discovery.training_modes.includes(m.value);
                    setDiscovery({
                      ...discovery,
                      training_modes: has
                        ? discovery.training_modes.filter((x) => x !== m.value)
                        : [...discovery.training_modes, m.value],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    discovery.training_modes.includes(m.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">جلسة تجريبية مجانية</p>
              <p className="text-xs text-muted-foreground">عرض حصة تجريبية للعملاء الجدد</p>
            </div>
            <Switch
              checked={discovery.trial_sessions}
              onCheckedChange={(v) => setDiscovery({ ...discovery, trial_sessions: v })}
            />
          </div>

          <Button className="w-full gap-2" variant="outline" onClick={handleSaveDiscovery} disabled={savingDiscovery}>
            {savingDiscovery ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            حفظ ملف الاكتشاف
          </Button>
        </Card>

        {/* ━━━ PAYMENT SETTINGS ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">إعدادات الدفع 💰</h2>
          </div>
          <p className="text-sm text-muted-foreground">أضف بيانات حسابك البنكي لاستقبال المدفوعات من العملاء</p>

          <div>
            <label className="text-sm font-medium text-foreground">اسم صاحب الحساب</label>
            <Input
              value={paymentForm.account_holder_name}
              onChange={(e) => setPaymentForm({ ...paymentForm, account_holder_name: e.target.value })}
              placeholder="الاسم كما يظهر في الحساب البنكي"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">رقم الآيبان (IBAN)</label>
            <Input
              value={paymentForm.iban}
              onChange={(e) => setPaymentForm({ ...paymentForm, iban: e.target.value })}
              placeholder="SA..."
              dir="ltr"
              maxLength={24}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">اسم البنك</label>
            <Input
              value={paymentForm.bank_name}
              onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
              placeholder="مثال: الراجحي، الأهلي..."
            />
          </div>
          <Button
            className="w-full gap-2"
            variant="outline"
            disabled={savingPayment}
            onClick={async () => {
              if (!user) return;
              setSavingPayment(true);
              try {
                const payload = { trainer_id: user.id, ...paymentForm };
                const { data: existing } = await supabase
                  .from("trainer_payment_settings")
                  .select("id")
                  .eq("trainer_id", user.id)
                  .maybeSingle();
                if (existing) {
                  await supabase.from("trainer_payment_settings").update(paymentForm).eq("trainer_id", user.id);
                } else {
                  await supabase.from("trainer_payment_settings").insert(payload);
                }
                toast({ title: "تم حفظ بيانات الدفع ✅" });
              } catch {
                toast({ title: "حدث خطأ", variant: "destructive" });
              } finally {
                setSavingPayment(false);
              }
            }}
          >
            {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ بيانات الدفع
          </Button>
        </Card>

        {/* ━━━ USERNAME ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
             <h2 className="text-lg font-bold text-card-foreground">رابط الصفحة الشخصية العامة</h2>
           </div>
           <p className="text-sm text-muted-foreground">اختر اسم مستخدم فريد لرابط صفحتك الشخصية</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">اسم المستخدم</label>
              <Input
                value={usernameForm}
                onChange={(e) => setUsernameForm(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="your-name"
                dir="ltr"
              />
            </div>
            <Button
              variant="outline"
              disabled={savingUsername || !usernameForm.trim()}
              onClick={async () => {
                if (!user) return;
                setSavingUsername(true);
                try {
                  const { error } = await supabase
                    .from("profiles")
                    .update({ username: usernameForm.trim() } as any)
                    .eq("user_id", user.id);
                  if (error) {
                    if (error.message.includes("unique")) {
                      toast({ title: "اسم المستخدم مستخدم بالفعل", variant: "destructive" });
                    } else throw error;
                  } else {
                    await refreshProfile();
                    toast({ title: "تم حفظ اسم المستخدم ✅" });
                  }
                } catch {
                  toast({ title: "حدث خطأ", variant: "destructive" });
                } finally {
                  setSavingUsername(false);
                }
              }}
            >
              {savingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
          {usernameForm && (
             <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground" dir="ltr">
                  https://fitni.lovable.app/t/{usernameForm}
                </p>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(`https://fitni.lovable.app/t/${usernameForm}`); toast({ title: "تم نسخ الرابط ✅" }); }}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" dir="ltr">
                https://fitni.lovable.app/pay/{usernameForm}
              </p>
            </div>
          )}
        </Card>

        {/* ━━━ PERSONAL PAGE ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">صفحتي الشخصية 🌐</h2>
          </div>
          {usernameForm ? (
            <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
              <p className="text-xs text-muted-foreground truncate" dir="ltr">fitni.lovable.app/t/{usernameForm}</p>
              <p className="text-[10px] text-muted-foreground">هذا الرابط عام — شاركه في انستقرام أو واتساب أو أي مكان 🔗</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-xs flex-1" onClick={() => { navigator.clipboard.writeText(`https://fitni.lovable.app/t/${usernameForm}`); toast({ title: "تم نسخ الرابط العام ✅" }); }}>
                  <Copy className="w-3 h-3" /> نسخ رابط صفحتك
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`تفضل رابط صفحتي: https://fitni.lovable.app/t/${usernameForm}`)}`, "_blank"); }}>
                  <MessageCircle className="w-3 h-3" /> واتساب
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 space-y-1">
              <p className="text-sm font-medium text-warning">⚠️ لم تنشئ اسم مستخدم بعد</p>
              <p className="text-xs text-muted-foreground">أنشئ اسم مستخدم في قسم "رابط الصفحة الشخصية العامة" أعلاه حتى تحصل على رابط صفحتك العامة وتتمكن من مشاركته</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/settings/page")}>
              <Globe className="w-4 h-4" /> تخصيص الصفحة ✏️
            </Button>
            {usernameForm && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`/t/${usernameForm}`, "_blank")}>
                معاينة 👁️
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">خصص صفحتك الشخصية التي يراها العملاء المحتملون</p>

          <div>
            <label className="text-sm font-medium text-foreground">اللقب</label>
            <Input
              value={personalPageForm.title}
              onChange={(e) => setPersonalPageForm({...personalPageForm, title: e.target.value})}
              placeholder="مثال: مدرب لياقة معتمد"
              maxLength={100}
            />
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">روابط سوشيال ميديا</label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={personalPageForm.social_instagram}
                  onChange={(e) => setPersonalPageForm({...personalPageForm, social_instagram: e.target.value})}
                  placeholder="اسم المستخدم في انستقرام"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={personalPageForm.social_twitter}
                  onChange={(e) => setPersonalPageForm({...personalPageForm, social_twitter: e.target.value})}
                  placeholder="اسم المستخدم في تويتر"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Gallery */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">صور المعرض</label>
            <p className="text-xs text-muted-foreground mb-3">صور تدريب، نتائج قبل/بعد (حتى 6 صور)</p>
            <div className="grid grid-cols-3 gap-2">
              {galleryImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={img.startsWith("http") ? img : ""} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {galleryImages.length < 6 && (
                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploadingGallery}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  <span className="text-xs">إضافة</span>
                </button>
              )}
            </div>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !user) return;
                if (f.size > 2 * 1024 * 1024) {
                  toast({ title: "حجم الصورة يجب أن يكون أقل من 2MB", variant: "destructive" });
                  return;
                }
                setUploadingGallery(true);
                try {
                  const ext = f.name.split(".").pop();
                  const path = `gallery/${user.id}/${Date.now()}.${ext}`;
                  const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, f, { upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: signedData } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
                  if (signedData?.signedUrl) {
                    setGalleryImages([...galleryImages, signedData.signedUrl]);
                  }
                } catch {
                  toast({ title: "حدث خطأ في رفع الصورة", variant: "destructive" });
                } finally {
                  setUploadingGallery(false);
                }
              }}
            />
          </div>

          <Button
            className="w-full gap-2"
            variant="outline"
            disabled={savingPersonalPage}
            onClick={async () => {
              if (!user) return;
              setSavingPersonalPage(true);
              try {
                const socialLinks: Record<string, string> = {};
                if (personalPageForm.social_instagram) socialLinks.instagram = personalPageForm.social_instagram;
                if (personalPageForm.social_twitter) socialLinks.twitter = personalPageForm.social_twitter;
                if (personalPageForm.social_tiktok) socialLinks.tiktok = personalPageForm.social_tiktok;

                const { error } = await supabase
                  .from("profiles")
                  .update({
                    title: personalPageForm.title,
                    social_links: socialLinks,
                    gallery_images: galleryImages,
                  } as any)
                  .eq("user_id", user.id);
                if (error) throw error;
                toast({ title: "تم حفظ صفحتك الشخصية ✅" });
              } catch {
                toast({ title: "حدث خطأ", variant: "destructive" });
              } finally {
                setSavingPersonalPage(false);
              }
            }}
          >
            {savingPersonalPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الصفحة الشخصية
          </Button>

          {/* Share Links */}
          {usernameForm && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">شارك صفحتك 🔗</label>
                <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                  <p className="text-sm text-foreground flex-1 truncate" dir="ltr">
                    fitni.lovable.app/t/{usernameForm}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                     navigator.clipboard.writeText(`https://fitni.lovable.app/t/${usernameForm}`);
                      toast({ title: "تم نسخ الرابط ✅" });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                       const url = `https://fitni.lovable.app/t/${usernameForm}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(`تفضل رابط صفحتي: ${url}`)}`, "_blank");
                    }}
                  >
                    واتساب
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                       const url = `https://fitni.lovable.app/t/${usernameForm}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "تم نسخ الرابط — الصقه في انستقرام ✅" });
                    }}
                  >
                    انستقرام
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ━━━ SAVE BUTTON ━━━ */}
        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>

        {/* ━━━ 4. ACCOUNT ━━━ */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">الحساب</h2>
          </div>

          {/* Plan Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">الباقة الحالية</p>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full inline-block mt-1 ${planColors[plan || "free"]}`}>
                {planLabels[plan || "free"]}
              </span>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/subscription")}>
              <CreditCard className="w-4 h-4" />
              إدارة الاشتراك
            </Button>
          </div>

          {profile?.subscribed_at && (
            <div>
              <p className="text-sm text-muted-foreground">تاريخ الاشتراك</p>
              <p className="text-sm font-medium text-card-foreground">
                {new Date(profile.subscribed_at).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          <Separator />

          {/* Change Password */}
          <div>
            <p className="text-sm font-medium text-card-foreground mb-2">تغيير كلمة المرور</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة"
                dir="ltr"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
                className="gap-1 shrink-0"
              >
                {changingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                تغيير
              </Button>
            </div>
          </div>

          <Separator />

          {/* Email */}
          <div>
            <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
            <p className="text-sm font-medium text-card-foreground" dir="ltr">{user?.email}</p>
          </div>

          <Separator />

          {/* Replay Tour */}
          <Button
            variant="outline"
            className="w-full gap-2 text-primary hover:text-primary"
            onClick={async () => {
              if (user) {
                await supabase.from("profiles").update({ onboarding_completed: false } as any).eq("user_id", user.id);
              }
              startTutorial();
            }}
          >
            <RotateCcw className="w-4 h-4" />
            إعادة الجولة التعريفية
          </Button>

          <Separator />

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </Card>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          title="ميزة الباقة الاحترافية"
          description="العلامة التجارية المخصصة متاحة في الباقة الاحترافية وباقة الجيم"
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
