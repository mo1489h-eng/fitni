import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/image-upload";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronUp, ChevronDown, Save, Loader2, Plus, X, Trash2, Star,
  Eye, GripVertical, Monitor, Smartphone, Copy, MessageCircle,
  QrCode, ArrowLeft, Palette, Type, Layout, Share2,
  Package, CheckCircle, Sparkles, CloudOff,
} from "lucide-react";

interface PageStat { label: string; value: string }
interface Testimonial { name: string; text: string; rating: number; result: string }
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
  theme: "dark", font: "tajawal", hero_style: "gradient",
  stats: [], specialties: [], about_text: "",
  gallery_layout: "grid", package_layout: "cards",
  testimonials: [], cta_subtitle: "أماكن محدودة هذا الشهر",
  sections_order: ["hero", "stats", "specialties", "about", "gallery", "packages", "testimonials", "cta"],
  hidden_sections: [], limited_offer_packages: [],
};

const ALL_SPECIALTIES = [
  "تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل",
  "رياضات قتالية", "يوغا", "كمال أجسام", "كروسفت", "رياضة نسائية",
];

const THEMES = [
  { value: "dark", label: "داكن", preview: "#050505", accent: "#16a34a" },
  { value: "light", label: "فاتح", preview: "#ffffff", accent: "#16a34a" },
  { value: "gold", label: "ذهبي", preview: "#050505", accent: "#d4a853" },
  { value: "blue", label: "أزرق", preview: "#050505", accent: "#3b82f6" },
];

const FONTS = [
  { value: "tajawal", label: "Tajawal" },
  { value: "cairo", label: "Cairo" },
  { value: "almarai", label: "Almarai" },
];

const SECTION_LABELS: Record<string, string> = {
  hero: "الهيرو", stats: "الإحصائيات", specialties: "التخصصات",
  about: "عن المدرب", gallery: "المعرض", packages: "الباقات",
  testimonials: "آراء العملاء", cta: "دعوة للعمل",
};

const ACCENT_COLORS = ["#16a34a", "#3b82f6", "#d4a853", "#ef4444", "#8b5cf6", "#ec4899"];

const PageBuilder = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const [config, setConfig] = useState<PageConfig>(DEFAULT_CONFIG);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [newStat, setNewStat] = useState({ label: "", value: "" });
  const [newTestimonial, setNewTestimonial] = useState<Testimonial>({ name: "", text: "", rating: 5, result: "" });
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-save on config change
  useEffect(() => {
    if (!user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from("profiles")
          .update({ page_config: config as any, gallery_images: galleryImages } as any)
          .eq("user_id", user.id);
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {}
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [config, galleryImages, user]);

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

  const removeStat = (i: number) => setConfig(c => ({ ...c, stats: c.stats.filter((_, idx) => idx !== i) }));

  const addTestimonial = () => {
    if (!newTestimonial.name || !newTestimonial.text) return;
    setConfig(c => ({ ...c, testimonials: [...c.testimonials, newTestimonial] }));
    setNewTestimonial({ name: "", text: "", rating: 5, result: "" });
  };

  const removeTestimonial = (i: number) => setConfig(c => ({ ...c, testimonials: c.testimonials.filter((_, idx) => idx !== i) }));

  const handleGalleryUpload = async (f: File) => {
    if (!user) return;
    setUploadingGallery(true);
    try {
      const path = `gallery/${user.id}/${Date.now()}.jpg`;
      const result = await uploadImage(f, "progress-photos", path);
      setGalleryImages(prev => [...prev, result.signedUrl]);
    } catch (err: any) {
      toast({ title: err.message || "حدث خطأ في رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingGallery(false);
    }
  };

  const publicDomain = "https://coachbase.health";
  const pageUrl = profile?.username ? `${publicDomain}/t/${profile.username}` : "";

  const themeColors: Record<string, { bg: string; accent: string; text: string; muted: string; card: string; border: string }> = {
    dark: { bg: "#050505", accent: "#16a34a", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
    light: { bg: "#ffffff", accent: "#16a34a", text: "#111", muted: "#666", card: "#f5f5f5", border: "#e5e5e5" },
    gold: { bg: "#050505", accent: "#d4a853", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
    blue: { bg: "#050505", accent: "#3b82f6", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
  };
  const pt = themeColors[config.theme] || themeColors.dark;

  return (
    <div className="min-h-screen bg-[#050505]" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-[hsl(0_0%_10%)] px-4 py-3 bg-[#050505]/90">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-[#888] hover:text-white" onClick={() => navigate("/settings")}>
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              الإعدادات
            </Button>
            {autoSaved && (
              <span className="text-xs text-[#555] flex items-center gap-1">
                <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                حُفظ تلقائياً
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-[#0f0f0f] rounded-lg p-1 border border-[hsl(0_0%_10%)]">
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded-md transition-colors ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-[#555] hover:text-white"}`}
              >
                <Smartphone className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded-md transition-colors ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-[#555] hover:text-white"}`}
              >
                <Monitor className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            {pageUrl && (
              <Button variant="outline" size="sm" className="gap-1.5 border-[hsl(0_0%_10%)] text-[#888] hover:text-white" onClick={() => window.open(pageUrl, "_blank")}>
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                معاينة
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={1.5} />}
              حفظ
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-57px)]">
        {/* ═══ EDITING PANEL (Left 40%) ═══ */}
        <div className="lg:w-[440px] w-full overflow-y-auto bg-[#0a0a0a] border-l border-[hsl(0_0%_10%)] lg:order-2 lg:max-h-[calc(100vh-57px)]">
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="w-full rounded-none border-b border-[hsl(0_0%_10%)] bg-[#0a0a0a] h-12 p-0">
              <TabsTrigger value="appearance" className="flex-1 gap-1.5 rounded-none data-[state=active]:bg-[#0f0f0f] data-[state=active]:text-white text-[#555] h-full text-xs">
                <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
                المظهر
              </TabsTrigger>
              <TabsTrigger value="content" className="flex-1 gap-1.5 rounded-none data-[state=active]:bg-[#0f0f0f] data-[state=active]:text-white text-[#555] h-full text-xs">
                <Layout className="w-3.5 h-3.5" strokeWidth={1.5} />
                المحتوى
              </TabsTrigger>
              <TabsTrigger value="packages" className="flex-1 gap-1.5 rounded-none data-[state=active]:bg-[#0f0f0f] data-[state=active]:text-white text-[#555] h-full text-xs">
                <Package className="w-3.5 h-3.5" strokeWidth={1.5} />
                الباقات
              </TabsTrigger>
              <TabsTrigger value="share" className="flex-1 gap-1.5 rounded-none data-[state=active]:bg-[#0f0f0f] data-[state=active]:text-white text-[#555] h-full text-xs">
                <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                المشاركة
              </TabsTrigger>
            </TabsList>

            {/* APPEARANCE TAB */}
            <TabsContent value="appearance" className="p-4 space-y-5 mt-0">
              {/* Theme */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">القالب</h3>
                <div className="grid grid-cols-4 gap-2">
                  {THEMES.map(t => (
                    <button key={t.value} onClick={() => setConfig({ ...config, theme: t.value })}
                      className={`rounded-xl p-3 text-center transition-all ${config.theme === t.value ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0a]" : "hover:opacity-80"}`}
                      style={{ backgroundColor: "#0f0f0f", border: `1px solid ${config.theme === t.value ? t.accent : "#1a1a1a"}` }}>
                      <div className="w-8 h-8 rounded-lg mx-auto mb-1.5" style={{ backgroundColor: t.preview, border: `2px solid ${t.accent}` }} />
                      <span className="text-xs text-[#888]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Font */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">الخط</h3>
                <div className="flex gap-2">
                  {FONTS.map(f => (
                    <button key={f.value} onClick={() => setConfig({ ...config, font: f.value })}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all ${config.font === f.value ? "bg-primary text-primary-foreground" : "bg-[#0f0f0f] text-[#888] border border-[hsl(0_0%_10%)] hover:border-[#333]"}`}
                      style={{ fontFamily: f.value }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Hero style */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">نمط الهيرو</h3>
                <div className="flex gap-2 flex-wrap">
                  {[{ value: "gradient", label: "تدرج" }, { value: "solid", label: "لون سادة" }, { value: "blur", label: "ضبابي" }].map(s => (
                    <button key={s.value} onClick={() => setConfig({ ...config, hero_style: s.value })}
                      className={`px-4 py-2 rounded-xl text-sm transition-all ${config.hero_style === s.value ? "bg-primary text-primary-foreground" : "bg-[#0f0f0f] text-[#888] border border-[hsl(0_0%_10%)]"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {config.hero_style === "solid" && (
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.hero_color || "#050505"} onChange={e => setConfig({ ...config, hero_color: e.target.value })} className="w-10 h-10 rounded-lg border border-[hsl(0_0%_10%)] cursor-pointer bg-transparent" />
                    <span className="text-xs text-[#555]">اختر لون الخلفية</span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* CONTENT TAB */}
            <TabsContent value="content" className="p-4 space-y-5 mt-0">
              {/* Sections order */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">ترتيب الأقسام</h3>
                <div className="space-y-1">
                  {config.sections_order.map((section, i) => (
                    <div key={section} className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                      <GripVertical className="w-4 h-4 text-[#333] shrink-0" strokeWidth={1.5} />
                      <span className="text-sm flex-1 text-white">{SECTION_LABELS[section]}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(i, -1)} className="text-[#555] hover:text-white p-1 disabled:opacity-30" disabled={i === 0}>
                          <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => moveSection(i, 1)} className="text-[#555] hover:text-white p-1 disabled:opacity-30" disabled={i === config.sections_order.length - 1}>
                          <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <Switch checked={!config.hidden_sections.includes(section)} onCheckedChange={() => toggleSection(section)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">الإحصائيات</h3>
                {config.stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                    <span className="text-sm flex-1 text-white">{stat.value} — {stat.label}</span>
                    <button onClick={() => removeStat(i)} className="text-red-500/60 hover:text-red-500 p-1"><X className="w-4 h-4" strokeWidth={1.5} /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={newStat.value} onChange={e => setNewStat({ ...newStat, value: e.target.value })} placeholder="50+" className="w-24 bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                  <Input value={newStat.label} onChange={e => setNewStat({ ...newStat, label: e.target.value })} placeholder="عميل" className="flex-1 bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                  <Button variant="outline" size="sm" onClick={addStat} disabled={!newStat.label || !newStat.value} className="border-[hsl(0_0%_10%)]">
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Specialties */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">التخصصات</h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_SPECIALTIES.map(s => (
                    <button key={s} onClick={() => setConfig(c => ({ ...c, specialties: c.specialties.includes(s) ? c.specialties.filter(x => x !== s) : [...c.specialties, s] }))}
                      className={`px-3 py-1.5 rounded-xl text-sm transition-all ${config.specialties.includes(s) ? "bg-primary text-primary-foreground" : "bg-[#0f0f0f] text-[#888] border border-[hsl(0_0%_10%)]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* About */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">عن المدرب</h3>
                <Textarea value={config.about_text} onChange={e => setConfig({ ...config, about_text: e.target.value })} placeholder="اكتب نبذة عن خبراتك وأسلوبك..." rows={5} maxLength={1000} className="bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                <p className="text-xs text-[#555] text-left" dir="ltr">{config.about_text.length}/1000</p>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">المعرض</h3>
                  <span className="text-xs text-[#555]">{galleryImages.length}/12</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[#0f0f0f] group border border-[hsl(0_0%_10%)]">
                      <img src={img.startsWith("http") ? img : ""} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                  {galleryImages.length < 12 && (
                    <button onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}
                      className="aspect-square rounded-xl border-2 border-dashed border-[hsl(0_0%_10%)] flex items-center justify-center text-[#555] hover:border-primary hover:text-primary transition-colors">
                      {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  )}
                </div>
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }} />
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* Testimonials */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">آراء العملاء</h3>
                {config.testimonials.map((tm, i) => (
                  <div key={i} className="bg-[#0f0f0f] rounded-xl p-3 space-y-1 border border-[hsl(0_0%_10%)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{tm.name}</span>
                      <button onClick={() => removeTestimonial(i)} className="text-red-500/60 hover:text-red-500 p-1"><X className="w-3 h-3" strokeWidth={1.5} /></button>
                    </div>
                    <p className="text-xs text-[#888]">{tm.text}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: tm.rating }).map((_, j) => <Star key={j} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
                    </div>
                    {tm.result && <p className="text-xs text-primary">{tm.result}</p>}
                  </div>
                ))}
                <div className="space-y-2">
                  <Input value={newTestimonial.name} onChange={e => setNewTestimonial({ ...newTestimonial, name: e.target.value })} placeholder="اسم العميل" className="bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                  <Textarea value={newTestimonial.text} onChange={e => setNewTestimonial({ ...newTestimonial, text: e.target.value })} placeholder="رأي العميل..." rows={2} className="bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                  <div className="flex gap-2">
                    <Input value={newTestimonial.result} onChange={e => setNewTestimonial({ ...newTestimonial, result: e.target.value })} placeholder="النتيجة (اختياري)" className="flex-1 bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(r => (
                        <button key={r} onClick={() => setNewTestimonial({ ...newTestimonial, rating: r })}>
                          <Star className={`w-4 h-4 ${r <= newTestimonial.rating ? "fill-yellow-500 text-yellow-500" : "text-[#333]"}`} strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 border-[hsl(0_0%_10%)] text-[#888]" onClick={addTestimonial} disabled={!newTestimonial.name || !newTestimonial.text}>
                    <Plus className="w-4 h-4" strokeWidth={1.5} /> إضافة رأي
                  </Button>
                </div>
              </div>

              <Separator className="bg-[hsl(0_0%_10%)]" />

              {/* CTA */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">دعوة للعمل</h3>
                <Input value={config.cta_subtitle} onChange={e => setConfig({ ...config, cta_subtitle: e.target.value })} placeholder="أماكن محدودة هذا الشهر" maxLength={100} className="bg-[#0f0f0f] border-[hsl(0_0%_10%)] text-white" />
              </div>
            </TabsContent>

            {/* PACKAGES TAB */}
            <TabsContent value="packages" className="p-4 space-y-4 mt-0">
              <h3 className="font-bold text-sm text-white">إدارة الباقات</h3>
              <p className="text-xs text-[#555]">حدد الباقة الأكثر طلباً لإبرازها في الصفحة</p>
              <div className="space-y-2">
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[hsl(0_0%_10%)] text-center">
                  <Package className="w-8 h-8 text-[#333] mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-[#888]">باقاتك تظهر تلقائياً من إعدادات الباقات</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-[hsl(0_0%_10%)] text-[#888]" onClick={() => navigate("/packages")}>
                    إدارة الباقات
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* SHARE TAB */}
            <TabsContent value="share" className="p-4 space-y-4 mt-0">
              <h3 className="font-bold text-sm text-white">رابط صفحتك</h3>
              {pageUrl ? (
                <>
                  <div className="flex items-center gap-2 bg-[#0f0f0f] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                    <p className="text-sm text-white flex-1 truncate" dir="ltr">{pageUrl.replace("https://", "")}</p>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(pageUrl); toast({ title: "تم نسخ الرابط" }); }} className="text-[#888] hover:text-white">
                      <Copy className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-[hsl(0_0%_10%)] text-[#888] hover:text-white hover:bg-green-600/10 hover:border-green-600/30" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`تفضل رابط صفحتي: ${pageUrl}`)}`, "_blank")}>
                      <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                      مشاركة عبر واتساب
                    </Button>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-[hsl(0_0%_10%)] text-[#888] hover:text-white" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`, "_blank")}>
                      <Share2 className="w-4 h-4" strokeWidth={1.5} />
                      مشاركة عبر لينكد إن
                    </Button>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 border-[hsl(0_0%_10%)] text-[#888] hover:text-white" onClick={() => {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pageUrl)}`;
                      window.open(qrUrl, "_blank");
                    }}>
                      <QrCode className="w-4 h-4" strokeWidth={1.5} />
                      رمز QR
                    </Button>
                  </div>
                </>
              ) : (
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[hsl(0_0%_10%)] text-center">
                  <CloudOff className="w-8 h-8 text-[#333] mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-[#888]">أضف اسم مستخدم من الإعدادات أولاً</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-[hsl(0_0%_10%)] text-[#888]" onClick={() => navigate("/settings")}>
                    الإعدادات
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ═══ PREVIEW PANEL (Right 60%) ═══ */}
        <div className="flex-1 bg-[#0a0a0a] flex items-start justify-center p-4 lg:p-8 overflow-y-auto lg:order-1 lg:max-h-[calc(100vh-57px)]">
          <div className={`bg-[#050505] rounded-2xl border border-[hsl(0_0%_10%)] overflow-hidden shadow-2xl transition-all duration-300 ${
            previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[900px]"
          }`}>
            {/* Browser chrome */}
            <div className="bg-[#0f0f0f] px-4 py-2.5 flex items-center gap-2 border-b border-[hsl(0_0%_10%)]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="flex-1 bg-[#1a1a1a] rounded-lg py-1 px-3">
                <p className="text-[10px] text-[#555] text-center truncate" dir="ltr">
                  {pageUrl || "coachbase.health/t/username"}
                </p>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto" dir="rtl" style={{ fontFamily: config.font }}>
              <PreviewContent config={config} profile={profile} galleryImages={galleryImages} pt={pt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ PREVIEW COMPONENT ═══ */
const PreviewContent = ({ config, profile, galleryImages, pt }: { config: PageConfig; profile: any; galleryImages: string[]; pt: any }) => {
  const t = pt;

  const renderSection = (section: string) => {
    if (config.hidden_sections.includes(section)) return null;

    switch (section) {
      case "hero":
        return (
          <div key={section} className="px-6 pt-10 pb-6 text-center relative" style={{
            background: config.hero_style === "gradient"
              ? `radial-gradient(ellipse at 50% 30%, ${t.accent}15 0%, transparent 60%)`
              : config.hero_style === "solid"
              ? config.hero_color || t.bg
              : `linear-gradient(180deg, ${t.bg}90 0%, ${t.bg} 100%)`,
          }}>
            <div className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center text-lg font-bold overflow-hidden" style={{
              border: `2px solid ${t.border}`,
              backgroundColor: profile?.avatar_url ? "transparent" : `${t.accent}15`,
              color: t.accent,
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"
              )}
            </div>
            <h2 className="text-lg font-bold" style={{ color: t.text }}>{profile?.full_name || "اسم المدرب"}</h2>
            {profile?.title && <p className="text-xs mt-1" style={{ color: t.muted }}>{profile.title}</p>}
            {config.specialties.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-3">
                {config.specialties.slice(0, 3).map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-lg text-[9px] font-medium" style={{ backgroundColor: `${t.accent}12`, color: t.accent, border: `1px solid ${t.accent}25` }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 inline-block px-5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: t.accent }}>
              اشترك الآن
            </div>
          </div>
        );

      case "stats":
        if (!config.stats.length) return null;
        return (
          <div key={section} className="flex justify-center gap-4 px-6 py-4" style={{ borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
            {config.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-sm font-black" style={{ color: t.accent }}>{stat.value}</p>
                <p className="text-[10px]" style={{ color: t.muted }}>{stat.label}</p>
              </div>
            ))}
          </div>
        );

      case "specialties": return null;

      case "about":
        if (!config.about_text) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>عن المدرب</h3>
            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: t.muted }}>{config.about_text}</p>
          </div>
        );

      case "gallery":
        if (!galleryImages.length) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>نتائج حقيقية</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {galleryImages.slice(0, 4).map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: "1", backgroundColor: t.card }}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        );

      case "packages":
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>اختر باقتك</h3>
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: t.text }}>باقة {i}</span>
                    <span className="text-xs font-bold" style={{ color: t.accent }}>--- ر.س</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: t.muted }}>تحمّل من باقاتك تلقائياً</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "testimonials":
        if (!config.testimonials.length) return null;
        return (
          <div key={section} className="px-6 py-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: t.text }}>آراء العملاء</h3>
            <div className="space-y-2">
              {config.testimonials.slice(0, 2).map((tm, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: tm.rating }).map((_, j) => <Star key={j} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
                  </div>
                  <p className="text-[10px] mb-1" style={{ color: t.muted }}>"{tm.text}"</p>
                  <p className="text-[10px] font-bold" style={{ color: t.text }}>— {tm.name}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "cta":
        return (
          <div key={section} className="px-6 py-8 text-center" style={{ background: `linear-gradient(180deg, ${t.accent}08 0%, ${t.accent}15 100%)` }}>
            <h3 className="text-sm font-bold mb-1" style={{ color: t.text }}>ابدأ رحلتك الآن</h3>
            {config.cta_subtitle && <p className="text-[10px] mb-3" style={{ color: t.muted }}>{config.cta_subtitle}</p>}
            <div className="inline-block px-5 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: t.accent }}>
              اشترك الآن
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div style={{ backgroundColor: t.bg, minHeight: 400 }}>
      {config.sections_order.map(section => renderSection(section))}
      <div className="px-6 py-4 text-center">
        <p className="text-[9px]" style={{ color: `${t.text}30` }}>صُنع في السعودية</p>
      </div>
    </div>
  );
};

export default PageBuilder;
