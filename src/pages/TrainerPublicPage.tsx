import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dumbbell, Loader2, CheckCircle, ArrowLeft, ArrowDown,
  CreditCard, Eye, EyeOff, Star, Flame, Activity,
  MapPin, Clock, Users, ChevronLeft, ShieldCheck,
  User, Phone, Mail, Lock, Scale, Ruler, Target,
  MessageCircle, Share2, Sparkles, Award,
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



const THEME_COLORS: Record<string, { bg: string; accent: string; text: string; muted: string; card: string; border: string }> = {
  dark: { bg: "#050505", accent: "#16a34a", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
  light: { bg: "#ffffff", accent: "#16a34a", text: "#111", muted: "#666", card: "#f5f5f5", border: "#e5e5e5" },
  gold: { bg: "#050505", accent: "#d4a853", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
  blue: { bg: "#050505", accent: "#3b82f6", text: "#ededed", muted: "#888", card: "#0f0f0f", border: "#1a1a1a" },
};

const DEFAULT_ORDER = ["hero", "stats", "specialties", "about", "gallery", "packages", "testimonials", "cta"];

const SPECIALTY_ICONS: Record<string, any> = {
  "تخسيس": Flame,
  "بناء عضلات": Dumbbell,
  "لياقة عامة": Activity,
  "تأهيل": Award,
  "كمال أجسام": Dumbbell,
  "كروسفت": Activity,
};

const TrainerPublicPage = () => {
  const { username } = useParams();
  const [selectedPackage, setSelectedPackage] = useState<TrainerPackage | null>(null);
  const [step, setStep] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const [clientForm, setClientForm] = useState({
    full_name: "", phone: "", age: "", weight: "", height: "",
    goal: "تخسيس", notes: "", email: "", password: "", confirm_password: "",
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const { data: discoveryProfile } = useQuery({
    queryKey: ["discovery-profile", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_discovery_profiles")
        .select("city")
        .eq("trainer_id", profile!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const scrollToPackages = () => packagesRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSelectPackage = (pkg: TrainerPackage) => {
    setSelectedPackage(pkg);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [tapLoading, setTapLoading] = useState(false);

  const handleTapPayment = async () => {
    if (!selectedPackage || !profile) return;
    setTapLoading(true);
    try {
      sessionStorage.setItem("tap_payment_context", JSON.stringify({
        type: "package_purchase",
        package_id: selectedPackage.id,
        trainer_id: profile.user_id,
        return_url: window.location.href,
      }));

      const { data, error } = await supabase.functions.invoke("create-tap-charge", {
        body: {
          amount: selectedPackage.price,
          currency: "SAR",
          description: `اشتراك ${selectedPackage.name} — ${profile.full_name}`,
          redirect_url: `${window.location.origin}/payment/callback?type=package_purchase&package_id=${selectedPackage.id}&trainer_id=${profile.user_id}&username=${username}`,
          metadata: { type: "package_purchase", package_id: selectedPackage.id, trainer_id: profile.user_id },
        },
      });

      if (error || !data?.redirect_url) {
        throw new Error(data?.error || "فشل إنشاء عملية الدفع");
      }

      window.location.href = data.redirect_url;
    } catch (err: any) {
      setTapLoading(false);
      alert(err.message || "حدث خطأ في الدفع");
    }
  };

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
      setFormError(err.message || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center p-4" dir="rtl">
        <div>
          <Dumbbell className="w-12 h-12 text-[#555] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-white mb-2">الصفحة غير موجودة</h1>
          <p className="text-sm text-[#888]">تأكد من الرابط وحاول مرة أخرى</p>
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
  const city = discoveryProfile?.city || "";

  // ═══ SIGNUP FLOW (step > 0) ═══
  if (step > 0 && selectedPackage) {
    return (
      <div className="min-h-screen" dir="rtl" style={{ backgroundColor: t.bg, fontFamily }}>
        <header className="sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3" style={{ backgroundColor: `${t.bg}e6`, borderColor: t.border }}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => { if (step === 1) setStep(0); }} style={{ color: step === 1 ? t.muted : "transparent", pointerEvents: step === 1 ? "auto" : "none" }}>
              <ChevronLeft className="w-5 h-5 rotate-180" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium" style={{ color: t.text }}>
              {step === 1 ? "الدفع" : step === 2 ? "إنشاء الحساب" : "تم بنجاح"}
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className="w-8 h-1 rounded-full transition-all duration-500" style={{ backgroundColor: s <= step ? brandColor : `${t.text}15` }} />
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-5">
          {/* STEP 1: Payment */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* Package summary */}
              <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: t.text }}>{selectedPackage.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: t.muted }}>اشتراك مع {profile.full_name}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black" style={{ color: brandColor }}>{selectedPackage.price}</p>
                  <p className="text-[10px]" style={{ color: t.muted }}>ر.س/شهر</p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold mb-1" style={{ color: t.text }}>إتمام الدفع</h2>
                <p className="text-sm" style={{ color: t.muted }}>ادفع بالبطاقة الائتمانية أو Apple Pay</p>
              </div>

              <div className="rounded-2xl p-5" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: t.muted }}>
                  <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                  <span>معلومات الدفع</span>
                </div>
                <div ref={moyasarRef} className="moyasar-form" />
              </div>

              <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: t.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                الدفع آمن ومشفر عبر Moyasar
              </p>
            </div>
          )}

          {/* STEP 2: Registration */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${brandColor}15` }}>
                  <CheckCircle className="w-8 h-8" style={{ color: brandColor }} strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: t.text }}>تم الدفع بنجاح</h2>
                <p className="text-sm mt-1" style={{ color: t.muted }}>أنشئ حسابك لمتابعة رحلتك مع {profile.full_name}</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "الاسم الكامل", key: "full_name", icon: User, placeholder: "اسمك الكامل", type: "text", required: true },
                  { label: "رقم الجوال", key: "phone", icon: Phone, placeholder: "05XXXXXXXX", type: "tel", required: true, dir: "ltr" },
                  { label: "البريد الإلكتروني", key: "email", icon: Mail, placeholder: "email@example.com", type: "email", required: true, dir: "ltr" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: t.text }}>{field.label} *</label>
                    <div className="relative">
                      <field.icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.muted }} strokeWidth={1.5} />
                      <Input
                        value={(clientForm as any)[field.key]}
                        onChange={e => setClientForm({ ...clientForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        type={field.type}
                        dir={field.dir}
                        className="pr-10"
                        style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }}
                      />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={{ color: t.text }}>كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.muted }} strokeWidth={1.5} />
                    <Input value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} placeholder="6 أحرف على الأقل" type={showPassword ? "text" : "password"} dir="ltr" className="pr-10" style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={{ color: t.text }}>تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.muted }} strokeWidth={1.5} />
                    <Input value={clientForm.confirm_password} onChange={e => setClientForm({ ...clientForm, confirm_password: e.target.value })} placeholder="أعد كتابة كلمة المرور" type={showConfirmPassword ? "text" : "password"} dir="ltr" className="pr-10" style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {clientForm.confirm_password && clientForm.password !== clientForm.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">كلمة المرور غير متطابقة</p>
                  )}
                </div>

                <div className="pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
                  <p className="text-sm font-medium mb-3" style={{ color: t.text }}>معلومات إضافية (اختياري)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: t.muted }}>العمر</label>
                      <Input value={clientForm.age} onChange={e => setClientForm({ ...clientForm, age: e.target.value })} type="number" placeholder="25" style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: t.muted }}>الوزن (كجم)</label>
                      <Input value={clientForm.weight} onChange={e => setClientForm({ ...clientForm, weight: e.target.value })} type="number" placeholder="75" style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }} />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: t.muted }}>الطول (سم)</label>
                      <Input value={clientForm.height} onChange={e => setClientForm({ ...clientForm, height: e.target.value })} type="number" placeholder="175" style={{ backgroundColor: t.card, borderColor: t.border, color: t.text }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: t.text }}>الهدف</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل"].map(g => (
                      <button key={g} onClick={() => setClientForm({ ...clientForm, goal: g })}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{ backgroundColor: clientForm.goal === g ? `${brandColor}20` : t.card, color: clientForm.goal === g ? brandColor : t.muted, border: `1px solid ${clientForm.goal === g ? brandColor : t.border}` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  {formError}
                </div>
              )}

              <Button
                className="w-full h-12 text-base font-bold rounded-xl"
                onClick={handleRegisterSubmit}
                disabled={submitting || !clientForm.full_name.trim() || !clientForm.phone.trim() || !clientForm.email.trim() || clientForm.password.length < 6 || clientForm.password !== clientForm.confirm_password}
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري إنشاء حسابك...</> : <>إنشاء الحساب <ArrowLeft className="w-4 h-4 mr-1" strokeWidth={1.5} /></>}
              </Button>
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-6 py-16 animate-fade-in">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-bounce" style={{ backgroundColor: `${brandColor}15` }}>
                <CheckCircle className="w-12 h-12" style={{ color: brandColor }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>مرحباً {clientForm.full_name}!</h2>
                <p className="text-sm" style={{ color: t.muted }}>تم إنشاء حسابك بنجاح</p>
              </div>
              <div className="rounded-2xl p-5 text-right space-y-3" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                <p className="text-sm" style={{ color: t.muted }}>تم إرسال بيانات الدخول على إيميلك</p>
                <div style={{ borderTop: `1px solid ${t.border}` }} className="pt-3 space-y-2">
                  <p className="text-sm"><span style={{ color: t.muted }}>الباقة:</span> <span className="font-medium" style={{ color: t.text }}>{selectedPackage.name}</span></p>
                  <p className="text-sm"><span style={{ color: t.muted }}>الإيميل:</span> <span className="font-medium" style={{ color: t.text }} dir="ltr">{clientForm.email}</span></p>
                </div>
              </div>
              <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={() => window.location.href = "/client-login"} style={{ backgroundColor: brandColor }}>
                ادخل لبوابتك الآن <ArrowLeft className="w-4 h-4 mr-1" strokeWidth={1.5} />
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ═══ LANDING PAGE ═══
  const renderSection = (section: string) => {
    if (hiddenSections.includes(section)) return null;

    switch (section) {
      case "hero":
        return (
          <section key={section} className="relative min-h-screen flex items-center overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0" style={{
              background: pc.hero_style === "gradient"
                ? `radial-gradient(ellipse at 70% 50%, ${brandColor}12 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, ${brandColor}08 0%, transparent 50%)`
                : pc.hero_style === "solid"
                ? pc.hero_color || t.bg
                : `linear-gradient(180deg, ${t.bg}dd 0%, ${t.bg} 100%)`,
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: `linear-gradient(to top, ${t.bg}, transparent)` }} />

            <div className="max-w-6xl mx-auto px-6 py-20 relative w-full">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Left side - Content */}
                <div className="flex-1 lg:max-w-[60%] text-center lg:text-right order-2 lg:order-1">
                  {/* Label pill */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ backgroundColor: `${brandColor}12`, border: `1px solid ${brandColor}25` }}>
                    <Award className="w-3.5 h-3.5" style={{ color: brandColor }} strokeWidth={1.5} />
                    <span className="text-xs font-medium" style={{ color: brandColor }}>
                      مدرب معتمد{city ? ` \u2022 ${city}` : ""}
                    </span>
                  </div>

                  <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-4" style={{ color: t.text }}>
                    {profile.full_name}
                  </h1>

                  {profile.title && (
                    <p className="text-xl lg:text-2xl font-medium mb-4" style={{ color: `${t.text}90` }}>{profile.title}</p>
                  )}

                  {profile.bio && (
                    <p className="text-base leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0" style={{ color: t.muted }}>{profile.bio}</p>
                  )}

                  {/* Specialty pills */}
                  {pc.specialties && pc.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8 justify-center lg:justify-start">
                      {pc.specialties.map(s => {
                        const IconComp = SPECIALTY_ICONS[s] || Activity;
                        return (
                          <span key={s} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: `${brandColor}10`, color: brandColor, border: `1px solid ${brandColor}25` }}>
                            <IconComp className="w-3.5 h-3.5" strokeWidth={1.5} />
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Stats row */}
                  {pc.stats && pc.stats.length > 0 && (
                    <div className="flex items-center gap-6 mb-8 justify-center lg:justify-start">
                      {pc.stats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          {i > 0 && <div className="w-px h-8" style={{ backgroundColor: `${t.text}15` }} />}
                          <div className={i > 0 ? "pr-3" : ""}>
                            <p className="text-2xl font-black" style={{ color: brandColor }}>{stat.value}</p>
                            <p className="text-xs" style={{ color: t.muted }}>{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA buttons */}
                  {packages.length > 0 && (
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                      <button className="px-8 py-4 rounded-xl font-bold text-white text-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 hover:shadow-lg" style={{ backgroundColor: brandColor, boxShadow: `0 0 40px ${brandColor}30` }} onClick={scrollToPackages}>
                        اشترك الآن <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      {profile.social_links?.whatsapp && (
                        <a href={`https://wa.me/${profile.social_links.whatsapp}`} target="_blank" rel="noopener noreferrer"
                          className="px-6 py-4 rounded-xl font-medium text-sm flex items-center gap-2 transition-all hover:scale-105" style={{ color: t.text, border: `1px solid ${t.border}` }}>
                          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                          تواصل معي
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side - Photo */}
                <div className="relative order-1 lg:order-2 lg:max-w-[40%]">
                  {profile.avatar_url ? (
                    <div className="relative">
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-64 h-64 lg:w-80 lg:h-80 rounded-3xl object-cover" style={{ border: `2px solid ${t.border}` }} />
                      {/* Floating availability card */}
                      <div className="absolute -bottom-4 -right-4 lg:-right-8 rounded-2xl px-5 py-3 backdrop-blur-xl" style={{ backgroundColor: `${t.card}e6`, border: `1px solid ${t.border}` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: brandColor }} />
                          <span className="text-sm font-medium" style={{ color: t.text }}>متاح للاشتراك</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-64 h-64 lg:w-80 lg:h-80 rounded-3xl flex items-center justify-center text-5xl font-black" style={{ backgroundColor: `${brandColor}15`, color: brandColor, border: `2px solid ${t.border}` }}>
                      {profile.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case "stats":
        // Stats are rendered inside hero for desktop layout
        return null;

      case "specialties":
        // Specialties are rendered inside hero
        return null;

      case "about":
        if (!pc.about_text) return null;
        return (
          <section key={section} className="max-w-4xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-bold mb-6" style={{ color: t.text }}>عن المدرب</h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: t.muted }}>{pc.about_text}</p>
          </section>
        );

      case "gallery":
        if (!galleryUrls.length) return null;
        return (
          <section key={section} className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>نتائج حقيقية</h2>
              <p className="text-sm" style={{ color: t.muted }}>تحولات عملائنا تتحدث عن نفسها</p>
            </div>
            <div className={`grid gap-3 ${pc.gallery_layout === "masonry" ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
              {galleryUrls.map((url, i) => (
                <div key={i} className={`rounded-2xl overflow-hidden group cursor-pointer ${pc.gallery_layout === "masonry" && i === 0 ? "row-span-2" : ""}`}
                  style={{ aspectRatio: pc.gallery_layout === "masonry" && i === 0 ? "auto" : "1", backgroundColor: t.card }}>
                  <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        );

      case "packages":
        if (!packages.length) return null;
        return (
          <section key={section} ref={packagesRef} className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>اختر باقتك</h2>
              <p className="text-sm" style={{ color: t.muted }}>استثمر في نفسك</p>
            </div>
            <div className={`grid gap-5 ${packages.length === 1 ? "max-w-md mx-auto" : packages.length === 2 ? "grid-cols-1 lg:grid-cols-2 max-w-3xl mx-auto" : "grid-cols-1 lg:grid-cols-3"}`}>
              {packages.map((pkg) => {
                const isFeatured = pc.featured_package_id === pkg.id;
                return (
                  <div key={pkg.id} className="rounded-2xl p-6 space-y-5 transition-all relative" style={{
                    backgroundColor: t.card,
                    border: isFeatured ? `1px solid ${brandColor}` : `1px solid ${t.border}`,
                    boxShadow: isFeatured ? `0 0 60px ${brandColor}10` : "none",
                  }}>
                    {isFeatured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: brandColor, color: "#fff" }}>
                        الأكثر طلباً
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-xl mb-1" style={{ color: t.text }}>{pkg.name}</h3>
                      {pkg.description && <p className="text-sm" style={{ color: t.muted }}>{pkg.description}</p>}
                    </div>
                    <div>
                      <span className="text-4xl font-black" style={{ color: brandColor }}>{pkg.price}</span>
                      <span className="text-sm mr-1" style={{ color: t.muted }}>ر.س/{pkg.billing_cycle === "quarterly" ? "3 شهور" : pkg.billing_cycle === "yearly" ? "سنة" : "شهر"}</span>
                    </div>
                    <div className="space-y-3 py-2">
                      {pkg.sessions_per_week > 0 && <div className="flex items-center gap-3 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} strokeWidth={1.5} /><span>{pkg.sessions_per_week} جلسات أسبوعياً</span></div>}
                      {pkg.includes_program && <div className="flex items-center gap-3 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} strokeWidth={1.5} /><span>برنامج تدريب</span></div>}
                      {pkg.includes_nutrition && <div className="flex items-center gap-3 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} strokeWidth={1.5} /><span>جدول غذائي</span></div>}
                      {pkg.includes_followup && <div className="flex items-center gap-3 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} strokeWidth={1.5} /><span>متابعة يومية</span></div>}
                      {pkg.custom_features?.map((f, i) => <div key={i} className="flex items-center gap-3 text-sm" style={{ color: t.muted }}><CheckCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} strokeWidth={1.5} /><span>{f}</span></div>)}
                    </div>
                    <button className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: isFeatured ? brandColor : "transparent", border: isFeatured ? "none" : `1px solid ${t.border}`, color: isFeatured ? "#fff" : t.text }} onClick={() => handleSelectPackage(pkg)}>
                      اشترك الآن <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
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
          <section key={section} className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>ماذا يقول عملائي</h2>
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {pc.testimonials.map((tm, i) => (
                <div key={i} className="rounded-2xl p-6" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`w-4 h-4 ${j < tm.rating ? "fill-yellow-500 text-yellow-500" : ""}`} style={{ color: j < tm.rating ? undefined : `${t.text}20` }} strokeWidth={1.5} />)}
                  </div>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: t.muted }}>"{tm.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                      {tm.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: t.text }}>{tm.name}</p>
                      {tm.result && <p className="text-xs" style={{ color: brandColor }}>{tm.result}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case "cta":
        return (
          <section key={section} className="max-w-4xl mx-auto px-6 py-20">
            <div className="rounded-3xl p-12 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}08 100%)`, border: `1px solid ${brandColor}20` }}>
              {/* Green glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: `${brandColor}10` }} />
              <div className="relative">
                <h2 className="text-3xl font-bold mb-3" style={{ color: t.text }}>ابدأ رحلتك الآن</h2>
                {pc.cta_subtitle && <p className="text-sm mb-6" style={{ color: t.muted }}>{pc.cta_subtitle}</p>}
                {packages.length > 0 && (
                  <button className="px-10 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto" style={{ backgroundColor: brandColor, boxShadow: `0 0 40px ${brandColor}30` }} onClick={scrollToPackages}>
                    اشترك الآن <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          </section>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: t.bg, fontFamily }}>
      <title>{profile.full_name} — مدرب شخصي | CoachBase</title>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{
        backgroundColor: scrolled ? `${t.bg}e6` : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${t.border}` : "none",
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" style={{ color: brandColor }} strokeWidth={1.5} />
            <span className="font-black text-lg" style={{ color: t.text }}>CoachBase</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/client-login" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: t.muted }}>
              تسجيل دخول
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105" style={{ color: brandColor, border: `1px solid ${brandColor}40` }}>
              انضم كمدرب
            </Link>
          </div>
        </div>
      </nav>

      {sectionsOrder.map(section => renderSection(section))}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4" style={{ color: brandColor }} strokeWidth={1.5} />
          <span className="text-sm font-bold" style={{ color: t.text }}>CoachBase</span>
        </div>
        <p className="text-xs" style={{ color: t.muted }}>صُنع في السعودية</p>
      </footer>
    </div>
  );
};

export default TrainerPublicPage;
