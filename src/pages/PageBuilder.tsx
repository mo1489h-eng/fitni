import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, Save, Loader2, Plus, X, Trash2, Star,
  Eye, GripVertical, Camera, Monitor, Smartphone, Copy,
  Share2, QrCode, ArrowLeft,
} from "lucide-react";

interface PageStat { label: string; value: string }
interface Testimonial { name: string; text: string; rating: number; result: string; image?: string }
interface PageConfig {
  theme: string;
  font: string;
  hero_style: string;
  hero_image_url?: string;
  hero_color?: string;
  stats: PageStat[];
  specialties: string[];
  about_text: string;
  gallery_layout: string;
  package_layout: string;
  featured_package_id?: string;
  testimonials: Testimonial[];
  cta_subtitle: string;
  sections_order: string[];
  hidden_sections: string[];
  limited_offer_packages: string[];
}

const DEFAULT_CONFIG: PageConfig = {
  theme: "dark",
  font: "tajawal",
  hero_style: "gradient",
  stats: [],
  specialties: [],
  about_text: "",
  gallery_layout: "grid",
  package_layout: "cards",
  testimonials: [],
  cta_subtitle: "أماكن محدودة هذا الشهر",
  sections_order: ["hero", "stats", "specialties", "about", "gallery", "packages", "testimonials", "cta"],
  hidden_sections: [],
  limited_offer_packages: [],
};

const ALL_SPECIALTIES = [
  "تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل",
  "رياضات قتالية", "يوغا", "كمال أجسام", "كروسفت", "رياضة نسائية",
];

const THEMES = [
  { value: "dark", label: "داكن", colors: "bg-[#080808] border-primary" },
  { value: "light", label: "فاتح", colors: "bg-white border-green-500" },
  { value: "gold", label: "ذهبي", colors: "bg-[#080808] border-amber-500" },
  { value: "blue", label: "أزرق", colors: "bg-[#080808] border-blue-500" },
];

const FONTS = [
  { value: "tajawal", label: "Tajawal" },
  { value: "cairo", label: "Cairo" },
  { value: "almarai", label: "Almarai" },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "الهيرو",
  stats: "الإحصائيات",
  specialties: "التخصصات",
  about: "عن المدرب",
  gallery: "المعرض",
  packages: "الباقات",
  testimonials: "آراء العملاء",
  cta: "دعوة للعمل",
};

const PageBuilder = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [config, setConfig] = useState<PageConfig>(DEFAULT_CONFIG);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [newStat, setNewStat] = useState({ label: "", value: "" });
  const [newTestimonial, setNewTestimonial] = useState<Testimonial>({ name: "", text: "", rating: 5, result: "" });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("page_config, gallery_images")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const pc = (data as any).page_config;
        if (pc && typeof pc === "object" && Object.keys(pc).length > 0) {
          setConfig({ ...DEFAULT_CONFIG, ...pc });
        }
        setGalleryImages((data as any).gallery_images || []);
      }
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ page_config: config as any, gallery_images: galleryImages } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "تم حفظ تخصيص الصفحة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setConfig(c => ({
      ...c,
      hidden_sections: c.hidden_sections.includes(section)
        ? c.hidden_sections.filter(s => s !== section)
        : [...c.hidden_sections, section],
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const newOrder = [...config.sections_order];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setConfig({ ...config, sections_order: newOrder });
  };

  const addStat = () => {
    if (!newStat.label || !newStat.value) return;
    setConfig(c => ({ ...c, stats: [...c.stats, newStat] }));
    setNewStat({ label: "", value: "" });
  };

  const removeStat = (i: number) => {
    setConfig(c => ({ ...c, stats: c.stats.filter((_, idx) => idx !== i) }));
  };

  const addTestimonial = () => {
    if (!newTestimonial.name || !newTestimonial.text) return;
    setConfig(c => ({ ...c, testimonials: [...c.testimonials, newTestimonial] }));
    setNewTestimonial({ name: "", text: "", rating: 5, result: "" });
  };

  const removeTestimonial = (i: number) => {
    setConfig(c => ({ ...c, testimonials: c.testimonials.filter((_, idx) => idx !== i) }));
  };

  const handleGalleryUpload = async (f: File) => {
    if (!user) return;
    if (f.size > 2 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 2MB", variant: "destructive" });
      return;
    }
    setUploadingGallery(true);
    try {
      const ext = f.name.split(".").pop();
      const path = `gallery/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, f, { upsert: true });
      if (error) throw error;
      const { data: signedData } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedData?.signedUrl) setGalleryImages(prev => [...prev, signedData.signedUrl]);
    } catch {
      toast({ title: "حدث خطأ في رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingGallery(false);
    }
  };

  const publicDomain = "https://fitni.lovable.app";
  const pageUrl = profile?.username ? `${publicDomain}/t/${profile.username}` : "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate("/settings")}>
              <ArrowLeft className="w-4 h-4" />
              العودة للإعدادات
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-1.5 rounded-md transition-colors ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-1.5 rounded-md transition-colors ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
            {pageUrl && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(pageUrl, "_blank")}>
                <Eye className="w-4 h-4" />
                معاينة الصفحة العامة
              </Button>
            )}
            <Button size="sm" className="gap-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-57px)]">
        {/* ═══ EDITING PANEL ═══ */}
        <div className="lg:w-[420px] w-full overflow-y-auto border-l border-border p-4 space-y-5 lg:order-2 lg:max-h-[calc(100vh-57px)]">

          {/* THEME */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">المظهر 🎨</h3>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setConfig({ ...config, theme: t.value })}
                  className={`p-3 rounded-xl border-2 text-center text-xs font-medium transition-all ${
                    config.theme === t.value ? t.colors + " ring-2 ring-offset-2 ring-offset-background ring-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full mx-auto mb-1 ${t.colors.split(" ")[0]} border`} />
                  {t.label}
                </button>
              ))}
            </div>

            <Separator />
            <h3 className="font-bold text-sm text-card-foreground">الخط</h3>
            <div className="flex gap-2">
              {FONTS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setConfig({ ...config, font: f.value })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    config.font === f.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Card>

          {/* SECTIONS ORDER */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">ترتيب الأقسام</h3>
            <div className="space-y-1.5">
              {config.sections_order.map((section, i) => (
                <div key={section} className="flex items-center gap-2 bg-secondary rounded-lg p-2.5">
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 text-card-foreground">{SECTION_LABELS[section]}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSection(i, -1)} className="text-muted-foreground hover:text-foreground p-1" disabled={i === 0}>↑</button>
                    <button onClick={() => moveSection(i, 1)} className="text-muted-foreground hover:text-foreground p-1" disabled={i === config.sections_order.length - 1}>↓</button>
                    <Switch
                      checked={!config.hidden_sections.includes(section)}
                      onCheckedChange={() => toggleSection(section)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* HERO SETTINGS */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">الهيرو</h3>
            <p className="text-xs text-muted-foreground">نمط خلفية الهيرو</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "gradient", label: "تدرج" },
                { value: "solid", label: "لون سادة" },
                { value: "blur", label: "ضبابي" },
              ].map(s => (
                <button
                  key={s.value}
                  onClick={() => setConfig({ ...config, hero_style: s.value })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    config.hero_style === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {config.hero_style === "solid" && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.hero_color || "#080808"}
                  onChange={e => setConfig({ ...config, hero_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">اختر لون الخلفية</span>
              </div>
            )}
          </Card>

          {/* STATS */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">الإحصائيات</h3>
            {config.stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg p-2.5">
                <span className="text-sm flex-1 text-card-foreground">{stat.value} — {stat.label}</span>
                <button onClick={() => removeStat(i)} className="text-destructive hover:text-destructive/80 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newStat.value}
                onChange={e => setNewStat({ ...newStat, value: e.target.value })}
                placeholder="50+"
                className="w-24"
              />
              <Input
                value={newStat.label}
                onChange={e => setNewStat({ ...newStat, label: e.target.value })}
                placeholder="عميل"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addStat} disabled={!newStat.label || !newStat.value}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* SPECIALTIES */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">التخصصات</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SPECIALTIES.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setConfig(c => ({
                      ...c,
                      specialties: c.specialties.includes(s) ? c.specialties.filter(x => x !== s) : [...c.specialties, s],
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    config.specialties.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {/* ABOUT */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">عن المدرب</h3>
            <Textarea
              value={config.about_text}
              onChange={e => setConfig({ ...config, about_text: e.target.value })}
              placeholder="اكتب نبذة مفصلة عن خبراتك، شهاداتك، وأسلوبك في التدريب..."
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-left" dir="ltr">{config.about_text.length}/1000</p>
          </Card>

          {/* GALLERY */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">المعرض</h3>
            <p className="text-xs text-muted-foreground">حتى 12 صورة</p>
            <div className="flex gap-2 flex-wrap">
              {["grid", "masonry"].map(l => (
                <button
                  key={l}
                  onClick={() => setConfig({ ...config, gallery_layout: l })}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    config.gallery_layout === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {l === "grid" ? "شبكة" : "ماسونري"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {galleryImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={img.startsWith("http") ? img : ""} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {galleryImages.length < 12 && (
                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploadingGallery}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }}
            />
          </Card>

          {/* PACKAGES DISPLAY */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">عرض الباقات</h3>
            <div className="flex gap-2">
              {[
                { value: "cards", label: "بطاقات" },
                { value: "comparison", label: "مقارنة" },
              ].map(l => (
                <button
                  key={l.value}
                  onClick={() => setConfig({ ...config, package_layout: l.value })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    config.package_layout === l.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Card>

          {/* TESTIMONIALS */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">آراء العملاء ⭐</h3>
            {config.testimonials.map((t, i) => (
              <div key={i} className="bg-secondary rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">{t.name}</span>
                  <button onClick={() => removeTestimonial(i)} className="text-destructive p-1"><X className="w-3 h-3" /></button>
                </div>
                <p className="text-xs text-muted-foreground">{t.text}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-warning text-warning" />
                  ))}
                </div>
                {t.result && <p className="text-xs text-primary">{t.result}</p>}
              </div>
            ))}
            <Separator />
            <div className="space-y-2">
              <Input
                value={newTestimonial.name}
                onChange={e => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                placeholder="اسم العميل"
              />
              <Textarea
                value={newTestimonial.text}
                onChange={e => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                placeholder="رأي العميل..."
                rows={2}
              />
              <div className="flex gap-2">
                <Input
                  value={newTestimonial.result}
                  onChange={e => setNewTestimonial({ ...newTestimonial, result: e.target.value })}
                  placeholder="النتيجة (اختياري)"
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(r => (
                    <button key={r} onClick={() => setNewTestimonial({ ...newTestimonial, rating: r })}>
                      <Star className={`w-4 h-4 ${r <= newTestimonial.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1" onClick={addTestimonial} disabled={!newTestimonial.name || !newTestimonial.text}>
                <Plus className="w-4 h-4" /> إضافة رأي
              </Button>
            </div>
          </Card>

          {/* CTA */}
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm text-card-foreground">دعوة للعمل 🚀</h3>
            <Input
              value={config.cta_subtitle}
              onChange={e => setConfig({ ...config, cta_subtitle: e.target.value })}
              placeholder="أماكن محدودة هذا الشهر"
              maxLength={100}
            />
          </Card>

          {/* SHARE */}
          {pageUrl && (
            <Card className="p-4 space-y-3">
              <h3 className="font-bold text-sm text-card-foreground">شارك صفحتك 🔗</h3>
              <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                <p className="text-sm text-foreground flex-1 truncate" dir="ltr">
                  {pageUrl.replace("https://", "")}
                </p>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(pageUrl); toast({ title: "تم نسخ الرابط ✅" }); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`تفضل رابط صفحتي: ${pageUrl}`)}`, "_blank")}>
                  واتساب
                </Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(pageUrl); toast({ title: "تم نسخ الرابط ✅" }); }}>
                  انستقرام
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`, "_blank")}>
                  لينكد إن
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pageUrl)}`;
                  window.open(qrUrl, "_blank");
                }}>
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ═══ PREVIEW PANEL ═══ */}
        <div className="flex-1 bg-muted/30 flex items-start justify-center p-4 lg:p-8 overflow-y-auto lg:order-1 lg:max-h-[calc(100vh-57px)]">
          <div className={`bg-background rounded-2xl border border-border overflow-hidden shadow-2xl transition-all duration-300 ${
            previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[800px]"
          }`}>
            <div className="bg-secondary/50 px-4 py-2 flex items-center gap-2 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary/50" />
              </div>
              <p className="text-[10px] text-muted-foreground flex-1 text-center truncate" dir="ltr">
                {pageUrl || "fitni.app/t/username"}
              </p>
            </div>
            <div className="max-h-[600px] overflow-y-auto" dir="rtl" style={{ fontFamily: config.font }}>
              <PreviewContent config={config} profile={profile} galleryImages={galleryImages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ PREVIEW COMPONENT ═══ */
const PreviewContent = ({ config, profile, galleryImages }: { config: PageConfig; profile: any; galleryImages: string[] }) => {
  const themeColors: Record<string, { bg: string; accent: string; text: string; muted: string }> = {
    dark: { bg: "#080808", accent: "#16a34a", text: "#ededed", muted: "#888" },
    light: { bg: "#ffffff", accent: "#16a34a", text: "#111", muted: "#666" },
    gold: { bg: "#080808", accent: "#d4a853", text: "#ededed", muted: "#888" },
    blue: { bg: "#080808", accent: "#3b82f6", text: "#ededed", muted: "#888" },
  };
  const t = themeColors[config.theme] || themeColors.dark;

  const renderSection = (section: string) => {
    if (config.hidden_sections.includes(section)) return null;

    switch (section) {
      case "hero":
        return (
          <div key={section} className="px-6 pt-10 pb-6 text-center" style={{
            background: config.hero_style === "gradient"
              ? `linear-gradient(180deg, ${t.accent}15 0%, transparent 100%)`
              : config.hero_style === "solid"
              ? config.hero_color || t.bg
              : `linear-gradient(180deg, ${t.bg}90 0%, ${t.bg} 100%)`,
          }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-lg font-bold" style={{
              border: `3px solid ${t.accent}`,
              backgroundColor: profile?.avatar_url ? "transparent" : t.accent,
              color: "#fff",
              overflow: "hidden",
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"
              )}
            </div>
            <h2 className="text-lg font-bold" style={{ color: t.text }}>{profile?.full_name || "اسم المدرب"}</h2>
            {profile?.title && <p className="text-xs mt-1" style={{ color: t.muted }}>{profile.title}</p>}
            {profile?.bio && <p className="text-xs mt-2 leading-relaxed" style={{ color: t.muted }}>{profile.bio}</p>}
          </div>
        );

      case "stats":
        if (!config.stats.length) return null;
        return (
          <div key={section} className="flex justify-center gap-4 px-6 py-4" style={{ borderTop: `1px solid ${t.accent}20`, borderBottom: `1px solid ${t.accent}20` }}>
            {config.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-sm font-bold" style={{ color: t.accent }}>{stat.value}</p>
                <p className="text-[10px]" style={{ color: t.muted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        );

      case "specialties":
        if (!config.specialties.length) return null;
        return (
          <div key={section} className="flex flex-wrap justify-center gap-1.5 px-6 py-4">
            {config.specialties.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{
                backgroundColor: `${t.accent}15`, color: t.accent, border: `1px solid ${t.accent}30`,
              }}>
                {s}
              </span>
            ))}
          </div>
        );

      case "about":
        if (!config.about_text) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>عن المدرب 📝</h3>
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: t.muted }}>{config.about_text}</p>
          </div>
        );

      case "gallery":
        if (!galleryImages.length) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>المعرض 📸</h3>
            <div className={`grid gap-1.5 ${config.gallery_layout === "masonry" ? "grid-cols-3" : "grid-cols-2"}`}>
              {galleryImages.slice(0, 6).map((img, i) => (
                <div key={i} className={`rounded-lg overflow-hidden bg-gray-800 ${config.gallery_layout === "masonry" && i === 0 ? "row-span-2" : ""}`}
                  style={{ aspectRatio: config.gallery_layout === "masonry" && i === 0 ? "auto" : "1" }}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        );

      case "packages":
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>الباقات 💪</h3>
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl p-3 border" style={{ borderColor: `${t.accent}30`, backgroundColor: `${t.accent}05` }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: t.text }}>باقة {i}</span>
                    <span className="text-xs font-bold" style={{ color: t.accent }}>--- ر.س</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: t.muted }}>يتم تحميلها من باقاتك تلقائياً</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "testimonials":
        if (!config.testimonials.length) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>آراء العملاء ⭐</h3>
            <div className="space-y-2">
              {config.testimonials.slice(0, 3).map((tm, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: `${t.accent}08`, border: `1px solid ${t.accent}20` }}>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: tm.rating }).map((_, j) => (
                      <Star key={j} className="w-3 h-3" style={{ fill: "#eab308", color: "#eab308" }} />
                    ))}
                  </div>
                  <p className="text-[10px] mb-1" style={{ color: t.muted }}>"{tm.text}"</p>
                  <p className="text-[10px] font-bold" style={{ color: t.text }}>— {tm.name}</p>
                  {tm.result && <p className="text-[10px] mt-0.5" style={{ color: t.accent }}>{tm.result}</p>}
                </div>
              ))}
            </div>
          </div>
        );

      case "cta":
        return (
          <div key={section} className="px-6 py-8 text-center" style={{ background: `linear-gradient(180deg, ${t.accent}10 0%, ${t.accent}20 100%)` }}>
            <h3 className="text-sm font-bold mb-1" style={{ color: t.text }}>ابدأ رحلتك الآن 🚀</h3>
            {config.cta_subtitle && <p className="text-[10px] mb-3" style={{ color: t.muted }}>{config.cta_subtitle}</p>}
            <div className="inline-block px-5 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: t.accent }}>
              اشترك الآن ←
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: t.bg, minHeight: 400 }}>
      {config.sections_order.map(section => renderSection(section))}
    </div>
  );
};

export default PageBuilder;
