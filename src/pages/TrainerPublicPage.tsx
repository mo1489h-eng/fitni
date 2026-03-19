import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dumbbell, Loader2, CheckCircle, ArrowDown,
  Instagram, Twitter, ChevronLeft, CreditCard, Eye, EyeOff, Star,
} from "lucide-react";

interface TrainerProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  specialization: string | null;
  logo_url: string | null;
  brand_color: string | null;
  welcome_message: string | null;
  title: string | null;
  social_links: Record<string, string> | null;
  gallery_images: string[] | null;
  username: string | null;
  page_config: any | null;
}

interface TrainerPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  sessions_per_week: number;
  includes_program: boolean;
  includes_nutrition: boolean;
  includes_followup: boolean;
  custom_features: string[] | null;
}

interface PageConfig {
  theme?: string;
  font?: string;
  hero_style?: string;
  hero_color?: string;
  stats?: { label: string; value: string }[];
  specialties?: string[];
  about_text?: string;
  gallery_layout?: string;
  package_layout?: string;
  featured_package_id?: string;
  testimonials?: { name: string; text: string; rating: number; result: string }[];
  cta_subtitle?: string;
  sections_order?: string[];
  hidden_sections?: string[];
  limited_offer_packages?: string[];
}

const MOYASAR_PUBLISHABLE_KEY = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const THEME_COLORS: Record<string, { bg: string; accent: string; text: string; muted: string; card: string }> = {
  dark: { bg: "#080808", accent: "#16a34a", text: "#ededed", muted: "#888", card: "#111" },
  light: { bg: "#ffffff", accent: "#16a34a", text: "#111", muted: "#666", card: "#f5f5f5" },
  gold: { bg: "#080808", accent: "#d4a853", text: "#ededed", muted: "#888", card: "#111" },
  blue: { bg: "#080808", accent: "#3b82f6", text: "#ededed", muted: "#888", card: "#111" },
};

const DEFAULT_ORDER = ["hero", "stats", "specialties", "about", "gallery", "packages", "testimonials", "cta"];

const TrainerPublicPage = () => {
  const { username } = useParams();
  const [selectedPackage, setSelectedPackage] = useState<TrainerPackage | null>(null);
  // step: 0=landing, 1=payment, 2=registration, 3=success
  const [step, setStep] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const moyasarRef = useRef<HTMLDivElement>(null);
  const moyasarInitRef = useRef(false);
  const packagesRef = useRef<HTMLDivElement>(null);

  const [clientForm, setClientForm] = useState({
    full_name: "", phone: "", age: "", weight: "", height: "",
    goal: "تخسيس", notes: "", email: "", password: "", confirm_password: "",
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-trainer", username],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trainer_by_username" as any, { p_username: username! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as TrainerProfile | null;
    },
    enabled: !!username,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["public-packages", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_packages").select("*")
        .eq("trainer_id", profile!.user_id).eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data as TrainerPackage[];
    },
    enabled: !!profile?.user_id,
  });

  const { data: galleryUrls = [] } = useQuery({
    queryKey: ["gallery-urls", profile?.gallery_images],
    queryFn: async () => {
      if (!profile?.gallery_images?.length) return [];
      const urls: string[] = [];
      for (const path of profile.gallery_images) {
        if (path.startsWith("http")) { urls.push(path); }
        else {
          const { data } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) urls.push(data.signedUrl);
        }
      }
      return urls;
    },
    enabled: !!profile?.gallery_images?.length,
  });

  const scrollToPackages = () => packagesRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSelectPackage = (pkg: TrainerPackage) => {
    setSelectedPackage(pkg);
    setStep(1);
    moyasarInitRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 1: Init Moyasar payment
  useEffect(() => {
    if (step !== 1 || !selectedPackage || moyasarInitRef.current) return;
    const loadMoyasar = () => {
      if (!document.getElementById("moyasar-css")) {
        const link = document.createElement("link");
        link.id = "moyasar-css"; link.rel = "stylesheet";
        link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
        document.head.appendChild(link);
      }
      const initForm = () => {
        if (moyasarInitRef.current || !moyasarRef.current) return;
        moyasarInitRef.current = true;
        (window as any).Moyasar.init({
          element: moyasarRef.current,
          amount: selectedPackage.price * 100,
          currency: "SAR",
          description: `اشتراك ${selectedPackage.name} — ${profile?.full_name}`,
          publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
          callback_url: window.location.href,
          methods: ["creditcard", "applepay"],
          apple_pay: { country: "SA", label: "fitni", validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate" },
          on_completed: (payment: any) => {
            if (payment.status === "paid") {
              setPaymentId(payment.id);
              setStep(2);
            }
          },
        });
      };
      if ((window as any).Moyasar) initForm();
      else {
        const script = document.createElement("script");
        script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
        script.onload = initForm;
        document.head.appendChild(script);
      }
    };
    loadMoyasar();
    return () => { moyasarInitRef.current = false; };
  }, [step, selectedPackage]);

  // Step 2: Submit registration after payment
  const handleRegisterSubmit = async () => {
    if (!clientForm.full_name.trim() || !clientForm.phone.trim()) return;
    if (!clientForm.email.trim() || clientForm.password.length < 6) return;
    if (clientForm.password !== clientForm.confirm_password) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const { data, error } = await supabase.functions.invoke("signup-client", {
        body: {
          payment_id: paymentId, package_id: selectedPackage!.id, trainer_id: profile!.user_id,
          client_name: clientForm.full_name.trim(), client_phone: clientForm.phone.trim(),
          client_email: clientForm.email.trim(), client_password: clientForm.password,
          client_age: clientForm.age ? parseInt(clientForm.age) : null,
          client_weight: clientForm.weight ? parseFloat(clientForm.weight) : null,
          client_height: clientForm.height ? parseFloat(clientForm.height) : null,
          client_goal: clientForm.goal, client_notes: clientForm.notes.trim() || null,
          amount: selectedPackage!.price,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "حدث خطأ");
      setStep(3);
    } catch (err: any) {
      console.error("Signup error:", err);
      setFormError(err.message || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return <div className="min-h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center p-4" dir="rtl">
        <div>
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">الصفحة غير موجودة</h1>
          <p className="text-sm text-muted-foreground">تأكد من الرابط وحاول مرة أخرى</p>
        </div>
      </div>
    );
  }

  const pc: PageConfig = profile.page_config && typeof profile.page_config === "object" ? profile.page_config : {};
  const theme = pc.theme || "dark";
  const t = THEME_COLORS[theme] || THEME_COLORS.dark;
  const brandColor = t.accent;
  const fontFamily = pc.font || "Tajawal";
  const sectionsOrder = pc.sections_order || DEFAULT_ORDER;
  const hiddenSections = pc.hidden_sections || [];

  // ═══ SIGNUP FLOW (step > 0) ═══
  if (step > 0 && selectedPackage) {
    const totalSteps = 3;
    const currentStep = step;

    return (
      <div className="min-h-screen" dir="rtl" style={{ backgroundColor: t.bg, fontFamily }}>
        <header className="sticky top-0 z-50 backdrop-blur-md border-b px-4 py-3" style={{ backgroundColor: `${t.bg}e6`, borderColor: `${t.text}15` }}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => {
              if (step === 1) { setStep(0); }
              // Can't go back from step 2 (already paid) or step 3
            }} style={{ color: step === 1 ? t.muted : "transparent", pointerEvents: step === 1 ? "auto" : "none" }}>
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
            <span className="text-sm" style={{ color: t.muted }}>
              {step === 1 ? "الدفع" : step === 2 ? "إنشاء الحساب" : "تم بنجاح!"}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <div key={s} className="w-6 h-1 rounded-full" style={{ backgroundColor: s <= currentStep ? brandColor : `${t.text}20` }} />
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4">
          {/* STEP 1: Payment */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: t.text }}>إتمام الدفع 💳</h2>
                <p className="text-sm mt-1" style={{ color: t.muted }}>باقة {selectedPackage.name} — {selectedPackage.price} ر.س</p>
              </div>
              <Card className="p-4" style={{ backgroundColor: t.card, borderColor: `${t.text}15` }}>
                <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: t.muted }}>
                  <CreditCard className="w-4 h-4" /><span>ادفع بالبطاقة الائتمانية أو Apple Pay</span>
                </div>
                <div ref={moyasarRef} className="moyasar-form" />
              </Card>
              <p className="text-xs text-center" style={{ color: t.muted }}>الدفع آمن ومشفر عبر Moyasar 🔒</p>
            </div>
          )}

          {/* STEP 2: Registration form (after payment) */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${brandColor}15` }}>
                  <CheckCircle className="w-7 h-7" style={{ color: brandColor }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: t.text }}>تم الدفع بنجاح</h2>
                <p className="text-sm mt-1" style={{ color: t.muted }}>أنشئ حسابك في fitni للوصول لبوابة التدريب</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>الاسم الكامل *</label>
                  <Input value={clientForm.full_name} onChange={e => setClientForm({ ...clientForm, full_name: e.target.value })} placeholder="اسمك الكامل" />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>رقم الجوال *</label>
                  <Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="05XXXXXXXX" type="tel" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>البريد الإلكتروني *</label>
                  <Input value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} placeholder="email@example.com" type="email" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>كلمة المرور *</label>
                  <div className="relative">
                    <Input value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} placeholder="6 أحرف على الأقل" type={showPassword ? "text" : "password"} dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Input value={clientForm.confirm_password} onChange={e => setClientForm({ ...clientForm, confirm_password: e.target.value })} placeholder="أعد كتابة كلمة المرور" type={showConfirmPassword ? "text" : "password"} dir="ltr" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {clientForm.confirm_password && clientForm.password !== clientForm.confirm_password && (
                    <p className="text-xs text-destructive mt-1">كلمة المرور غير متطابقة</p>
                  )}
                </div>

                <div className="border-t pt-4" style={{ borderColor: `${t.text}15` }}>
                  <p className="text-sm font-medium mb-3" style={{ color: t.text }}>معلومات إضافية (اختياري)</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-sm font-medium" style={{ color: t.text }}>العمر</label><Input value={clientForm.age} onChange={e => setClientForm({ ...clientForm, age: e.target.value })} type="number" placeholder="25" /></div>
                  <div><label className="text-sm font-medium" style={{ color: t.text }}>الوزن (كجم)</label><Input value={clientForm.weight} onChange={e => setClientForm({ ...clientForm, weight: e.target.value })} type="number" placeholder="75" /></div>
                  <div><label className="text-sm font-medium" style={{ color: t.text }}>الطول (سم)</label><Input value={clientForm.height} onChange={e => setClientForm({ ...clientForm, height: e.target.value })} type="number" placeholder="175" /></div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>الهدف</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل"].map(g => (
                      <button key={g} onClick={() => setClientForm({ ...clientForm, goal: g })}
                        className="px-4 py-2 rounded-full text-sm border transition-colors"
                        style={{ backgroundColor: clientForm.goal === g ? brandColor : "transparent", color: clientForm.goal === g ? "#fff" : t.muted, borderColor: clientForm.goal === g ? brandColor : `${t.text}20` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: t.text }}>ملاحظات إضافية</label>
                  <Textarea value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} placeholder="إصابات سابقة، أمراض مزمنة..." rows={3} maxLength={500} />
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg text-sm text-center" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {formError}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleRegisterSubmit}
                disabled={submitting || !clientForm.full_name.trim() || !clientForm.phone.trim() || !clientForm.email.trim() || clientForm.password.length < 6 || clientForm.password !== clientForm.confirm_password}
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري إنشاء حسابك...</> : "إنشاء حسابي ←"}
              </Button>
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-6 py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${brandColor}15` }}>
                <CheckCircle className="w-10 h-10" style={{ color: brandColor }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>تم الاشتراك بنجاح</h2>
                <p style={{ color: t.muted }}>مرحباً {clientForm.full_name} في رحلتك مع {profile.full_name}</p>
              </div>
              <Card className="p-4 text-sm text-right space-y-2" style={{ backgroundColor: t.card, borderColor: `${t.text}15` }}>
                <p style={{ color: t.muted }}>تم إرسال بيانات دخولك على إيميلك</p>
                <div className="border-t my-2" style={{ borderColor: `${t.text}15` }} />
                <p><span style={{ color: t.muted }}>الباقة:</span> <span className="font-medium" style={{ color: t.text }}>{selectedPackage.name}</span></p>
                <p><span style={{ color: t.muted }}>الإيميل:</span> <span className="font-medium" style={{ color: t.text }} dir="ltr">{clientForm.email}</span></p>
              </Card>
              <Button className="w-full" onClick={() => window.location.href = "/client-login"} style={{ backgroundColor: brandColor }}>ادخل لبوابتك الآن ←</Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ═══ LANDING PAGE — Dynamic Sections ═══
  const renderSection = (section: string) => {
    if (hiddenSections.includes(section)) return null;

    switch (section) {
      case "hero":
        return (
          <section key={section} className="relative overflow-hidden">
            <div className="absolute inset-0" style={{
              background: pc.hero_style === "gradient"
                ? `linear-gradient(180deg, ${brandColor}08 0%, transparent 60%)`
                : pc.hero_style === "solid"
                ? pc.hero_color || t.bg
                : `linear-gradient(180deg, ${t.bg}dd 0%, ${t.bg} 100%)`,
            }} />
            <div className="max-w-lg mx-auto px-4 pt-12 pb-8 relative">
              <div className="flex items-center gap-2 mb-8">
                {profile.logo_url ? <img src={profile.logo_url} alt="" className="h-8 w-auto" /> : (
                  <><Dumbbell className="w-5 h-5" style={{ color: brandColor }} /><span className="font-black" style={{ color: t.text }}>fitni</span></>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-28 h-28 rounded-full object-cover border-4 mb-4" style={{ borderColor: brandColor }} />
                ) : (
                  <div className="w-28 h-28 rounded-full flex items-center justify-center mb-4 text-3xl font-bold text-white" style={{ backgroundColor: brandColor }}>
                    {profile.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                )}
                <h1 className="text-2xl font-bold" style={{ color: t.text }}>{profile.full_name}</h1>
                {profile.title && <p className="text-sm mt-1" style={{ color: t.muted }}>{profile.title}</p>}
                {profile.specialization && !pc.specialties?.length && (
                  <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${brandColor}20`, color: brandColor, border: `1px solid ${brandColor}40` }}>
                    {profile.specialization}
                  </span>
                )}
                {profile.bio && <p className="text-sm mt-4 max-w-sm leading-relaxed" style={{ color: t.muted }}>{profile.bio}</p>}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div className="flex gap-3 mt-4">
                    {profile.social_links.instagram && <a href={`https://instagram.com/${profile.social_links.instagram}`} target="_blank" rel="noopener noreferrer" style={{ color: t.muted }}><Instagram className="w-5 h-5 hover:opacity-80 transition-opacity" /></a>}
                    {profile.social_links.twitter && <a href={`https://twitter.com/${profile.social_links.twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: t.muted }}><Twitter className="w-5 h-5 hover:opacity-80 transition-opacity" /></a>}
                  </div>
                )}
                {packages.length > 0 && (
                  <button className="mt-6 px-6 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: brandColor }} onClick={scrollToPackages}>
                    اشترك الآن <ArrowDown className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        );

      case "stats":
        if (!pc.stats?.length) return null;
        return (
          <section key={section} className="max-w-lg mx-auto px-4">
            <div className="flex justify-center gap-6 py-5 border-y" style={{ borderColor: `${brandColor}20` }}>
              {pc.stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-black" style={{ color: brandColor }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: t.muted }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case "specialties":
        if (!pc.specialties?.length) return null;
        return (
          <section key={section} className="max-w-lg mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center gap-2">
              {pc.specialties.map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${brandColor}15`, color: brandColor, border: `1px solid ${brandColor}30` }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        );

      case "about":
        if (!pc.about_text) return null;
        return (
          <section key={section} className="max-w-lg mx-auto px-4 py-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>عن المدرب</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: t.muted }}>{pc.about_text}</p>
          </section>
        );

      case "gallery":
        if (!galleryUrls.length) return null;
        return (
          <section key={section} className="max-w-lg mx-auto px-4 py-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>المعرض</h2>
            <div className={`grid gap-2 ${pc.gallery_layout === "masonry" ? "grid-cols-3" : "grid-cols-2"}`}>
              {galleryUrls.map((url, i) => (
                <div key={i} className={`rounded-xl overflow-hidden ${pc.gallery_layout === "masonry" && i === 0 ? "row-span-2" : ""}`}
                  style={{ aspectRatio: pc.gallery_layout === "masonry" && i === 0 ? "auto" : "1", backgroundColor: t.card }}>
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        );

      case "packages":
        if (!packages.length) return null;
        return (
          <section key={section} ref={packagesRef} className="max-w-lg mx-auto px-4 py-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>اختر باقتك</h2>
            <div className="space-y-4">
              {packages.map((pkg) => {
                const isFeatured = pc.featured_package_id === pkg.id;
                const isLimited = pc.limited_offer_packages?.includes(pkg.id);
                return (
                  <div key={pkg.id} className="rounded-2xl p-5 space-y-4 transition-all" style={{
                    backgroundColor: t.card,
                    border: isFeatured ? `2px solid ${brandColor}` : `1px solid ${t.text}15`,
                    boxShadow: isFeatured ? `0 0 30px ${brandColor}15` : "none",
                  }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg" style={{ color: t.text }}>{pkg.name}</h3>
                          {isFeatured && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>الأكثر شعبية ⭐</span>}
                          {isLimited && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-destructive/20 text-destructive">عرض محدود 🔥</span>}
                        </div>
                        {pkg.description && <p className="text-sm mt-1" style={{ color: t.muted }}>{pkg.description}</p>}
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-bold" style={{ color: brandColor }}>{pkg.price}</p>
                        <p className="text-xs" style={{ color: t.muted }}>ر.س/{pkg.billing_cycle === "quarterly" ? "3 شهور" : pkg.billing_cycle === "yearly" ? "سنة" : "شهر"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {pkg.sessions_per_week > 0 && <div className="flex items-center gap-2 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} /><span>{pkg.sessions_per_week} جلسات أسبوعياً</span></div>}
                      {pkg.includes_program && <div className="flex items-center gap-2 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} /><span>برنامج تدريب</span></div>}
                      {pkg.includes_nutrition && <div className="flex items-center gap-2 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} /><span>جدول غذائي</span></div>}
                      {pkg.includes_followup && <div className="flex items-center gap-2 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} /><span>متابعة يومية</span></div>}
                      {pkg.custom_features?.map((f, i) => <div key={i} className="flex items-center gap-2 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} /><span>{f}</span></div>)}
                    </div>
                    <button className="w-full py-3 rounded-lg font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: brandColor }} onClick={() => handleSelectPackage(pkg)}>
                      اشترك الآن ←
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "testimonials":
        if (!pc.testimonials?.length) return null;
        return (
          <section key={section} className="max-w-lg mx-auto px-4 py-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>آراء العملاء ⭐</h2>
            <div className="space-y-3">
              {pc.testimonials.map((tm, i) => (
                <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: t.card, border: `1px solid ${t.text}10` }}>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: tm.rating }).map((_, j) => <Star key={j} className="w-4 h-4 fill-warning text-warning" />)}
                  </div>
                  <p className="text-sm mb-2" style={{ color: t.muted }}>"{tm.text}"</p>
                  <p className="text-sm font-bold" style={{ color: t.text }}>— {tm.name}</p>
                  {tm.result && <p className="text-xs mt-1" style={{ color: brandColor }}>{tm.result}</p>}
                </div>
              ))}
            </div>
          </section>
        );

      case "cta":
        return (
          <section key={section} className="max-w-lg mx-auto px-4 py-12">
            <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}25 100%)`, border: `1px solid ${brandColor}30` }}>
              <h2 className="text-xl font-bold mb-2" style={{ color: t.text }}>ابدأ رحلتك الآن 🚀</h2>
              {pc.cta_subtitle && <p className="text-sm mb-4" style={{ color: t.muted }}>{pc.cta_subtitle}</p>}
              {packages.length > 0 && (
                <button className="px-8 py-3 rounded-lg font-bold text-white text-lg transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: brandColor }} onClick={scrollToPackages}>
                  اشترك الآن ←
                </button>
              )}
            </div>
          </section>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: t.bg, fontFamily }}>
      <title>{profile.full_name} — مدرب شخصي | fitni</title>
      {sectionsOrder.map(section => renderSection(section))}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2" style={{ color: t.muted }}>
          <Dumbbell className="w-4 h-4" />
          <span className="text-xs">مدعوم من fitni</span>
        </div>
      </footer>
    </div>
  );
};

export default TrainerPublicPage;
