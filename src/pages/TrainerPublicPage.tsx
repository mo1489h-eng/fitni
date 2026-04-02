import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TrainerAchievements from "@/components/TrainerAchievements";
import TrainerAchievementStats from "@/components/TrainerAchievementStats";
import TrainerPageSEO from "@/components/TrainerPageSEO";
import {
  Dumbbell, Loader2, CheckCircle, ArrowLeft, ArrowDown,
  CreditCard, Eye, EyeOff, Star, Flame, Activity,
  ChevronLeft, ShieldCheck, User, Phone, Mail, Lock,
  MessageCircle, Award, Instagram, Twitter, ChevronDown,
  Globe, Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

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
  hero_image_url?: string;
  cover_image_url?: string;
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

/* ═══════════════════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════════════════ */

const useReveal = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const Reveal = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,32px,0)",
        transition: `opacity 800ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 800ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════ */

const COLORS = {
  bg: "#080808",
  card: "#111111",
  cardHover: "#161616",
  green: "#16a34a",
  greenGlow: "#16a34a40",
  border: "#1e1e1e",
  text: "#ededed",
  muted: "#888888",
  dim: "#555555",
};

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

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
  const [tapLoading, setTapLoading] = useState(false);

  const [clientForm, setClientForm] = useState({
    full_name: "", phone: "", age: "", weight: "", height: "",
    goal: "تخسيس", notes: "", email: "", password: "", confirm_password: "",
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ─── DATA FETCHING ─── */
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
        .from("trainer_discovery_profiles").select("city")
        .eq("trainer_id", profile!.user_id).maybeSingle();
      return data;
    },
    enabled: !!profile?.user_id,
  });

  /* ─── HANDLERS ─── */
  const scrollToPackages = () => packagesRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSelectPackage = (pkg: TrainerPackage) => {
    setSelectedPackage(pkg);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      if (error || !data?.redirect_url) throw new Error(data?.error || "فشل إنشاء عملية الدفع");
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

  /* ─── LOADING / NOT FOUND ─── */
  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.bg }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.green }} /></div>;
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4" dir="rtl" style={{ backgroundColor: COLORS.bg }}>
        <div>
          <Dumbbell className="w-12 h-12 mx-auto mb-4" style={{ color: COLORS.dim }} strokeWidth={1.5} />
          <h1 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>الصفحة غير موجودة</h1>
          <p className="text-sm" style={{ color: COLORS.muted }}>تأكد من الرابط وحاول مرة أخرى</p>
        </div>
      </div>
    );
  }

  const pc: PageConfig = profile.page_config && typeof profile.page_config === "object" ? profile.page_config : {};
  const brandColor = COLORS.green;
  const hiddenSections = pc.hidden_sections || [];
  const city = discoveryProfile?.city || "";

  /* ═══════════════════════════════════════════════════
     SIGNUP FLOW (step > 0)
     ═══════════════════════════════════════════════════ */
  if (step > 0 && selectedPackage) {
    return (
      <div className="min-h-screen" dir="rtl" style={{ backgroundColor: COLORS.bg, fontFamily: "Tajawal, sans-serif" }}>
        <header className="sticky top-0 z-50 backdrop-blur-xl px-4 py-3" style={{ backgroundColor: `${COLORS.bg}e6`, borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => { if (step === 1) setStep(0); }} style={{ color: step === 1 ? COLORS.muted : "transparent", pointerEvents: step === 1 ? "auto" : "none" }}>
              <ChevronLeft className="w-5 h-5 rotate-180" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium" style={{ color: COLORS.text }}>
              {step === 1 ? "الدفع" : step === 2 ? "إنشاء الحساب" : "تم بنجاح"}
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className="w-8 h-1 rounded-full transition-all duration-500" style={{ backgroundColor: s <= step ? brandColor : `${COLORS.text}15` }} />
              ))}
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto p-5">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: COLORS.text }}>{selectedPackage.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>اشتراك مع {profile.full_name}</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-black" style={{ color: brandColor }}>{selectedPackage.price}</p>
                  <p className="text-[10px]" style={{ color: COLORS.muted }}>ر.س/شهر</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-1" style={{ color: COLORS.text }}>إتمام الدفع</h2>
                <p className="text-sm" style={{ color: COLORS.muted }}>ادفع بالبطاقة الائتمانية أو Apple Pay</p>
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.muted }}>
                  <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                  <span>اختر طريقة الدفع</span>
                </div>
                <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
                  {["Mada", "Visa", "MC", "Apple Pay", "STC Pay"].map((m) => (
                    <div key={m} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>{m}</div>
                  ))}
                </div>
                <div className="rounded-xl p-4 text-center mb-4" style={{ backgroundColor: `${brandColor}08` }}>
                  <p className="text-3xl font-black" style={{ color: brandColor }}>{selectedPackage.price}</p>
                  <p className="text-sm" style={{ color: COLORS.muted }}>ر.س / شهرياً</p>
                </div>
                <Button onClick={handleTapPayment} disabled={tapLoading} className="w-full h-12 text-base gap-2 font-bold rounded-xl" style={{ backgroundColor: brandColor }}>
                  {tapLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  {tapLoading ? "جاري التحويل..." : "ادفع الآن"}
                </Button>
              </div>
              <p className="text-xs text-center flex items-center justify-center gap-1.5" style={{ color: COLORS.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                الدفع آمن ومشفر عبر Tap Payments
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${brandColor}15` }}>
                  <CheckCircle className="w-8 h-8" style={{ color: brandColor }} strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>تم الدفع بنجاح</h2>
                <p className="text-sm mt-1" style={{ color: COLORS.muted }}>أنشئ حسابك لمتابعة رحلتك مع {profile.full_name}</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "الاسم الكامل", key: "full_name", icon: User, placeholder: "اسمك الكامل", type: "text", required: true },
                  { label: "رقم الجوال", key: "phone", icon: Phone, placeholder: "05XXXXXXXX", type: "tel", required: true, dir: "ltr" as const },
                  { label: "البريد الإلكتروني", key: "email", icon: Mail, placeholder: "email@example.com", type: "email", required: true, dir: "ltr" as const },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: COLORS.text }}>{field.label} *</label>
                    <div className="relative">
                      <field.icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.muted }} strokeWidth={1.5} />
                      <Input
                        value={(clientForm as any)[field.key]}
                        onChange={e => setClientForm({ ...clientForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        type={field.type}
                        dir={field.dir}
                        className="pr-10"
                        style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }}
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={{ color: COLORS.text }}>كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.muted }} strokeWidth={1.5} />
                    <Input value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} placeholder="6 أحرف على الأقل" type={showPassword ? "text" : "password"} dir="ltr" className="pr-10" style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.muted }}>
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={{ color: COLORS.text }}>تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.muted }} strokeWidth={1.5} />
                    <Input value={clientForm.confirm_password} onChange={e => setClientForm({ ...clientForm, confirm_password: e.target.value })} placeholder="أعد كتابة كلمة المرور" type={showConfirmPassword ? "text" : "password"} dir="ltr" className="pr-10" style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.muted }}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {clientForm.confirm_password && clientForm.password !== clientForm.confirm_password && (
                    <p className="text-xs text-red-500 mt-1">كلمة المرور غير متطابقة</p>
                  )}
                </div>
                <div className="pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <p className="text-sm font-medium mb-3" style={{ color: COLORS.text }}>معلومات إضافية (اختياري)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "العمر", key: "age", placeholder: "25" },
                      { label: "الوزن (كجم)", key: "weight", placeholder: "75" },
                      { label: "الطول (سم)", key: "height", placeholder: "175" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>{f.label}</label>
                        <Input value={(clientForm as any)[f.key]} onChange={e => setClientForm({ ...clientForm, [f.key]: e.target.value })} type="number" placeholder={f.placeholder} style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.text }}>الهدف</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل"].map(g => (
                      <button key={g} onClick={() => setClientForm({ ...clientForm, goal: g })}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{ backgroundColor: clientForm.goal === g ? `${brandColor}20` : COLORS.card, color: clientForm.goal === g ? brandColor : COLORS.muted, border: `1px solid ${clientForm.goal === g ? brandColor : COLORS.border}` }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {formError && (
                <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{formError}</div>
              )}
              <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={handleRegisterSubmit} disabled={submitting || !clientForm.full_name.trim() || !clientForm.phone.trim() || !clientForm.email.trim() || clientForm.password.length < 6 || clientForm.password !== clientForm.confirm_password} style={{ backgroundColor: brandColor }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري إنشاء حسابك...</> : <>إنشاء الحساب <ArrowLeft className="w-4 h-4 mr-1" strokeWidth={1.5} /></>}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-16 animate-fade-in">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-bounce" style={{ backgroundColor: `${brandColor}15` }}>
                <CheckCircle className="w-12 h-12" style={{ color: brandColor }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>مرحباً {clientForm.full_name}!</h2>
                <p className="text-sm" style={{ color: COLORS.muted }}>تم إنشاء حسابك بنجاح</p>
              </div>
              <div className="rounded-2xl p-5 text-right space-y-3" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <p className="text-sm" style={{ color: COLORS.muted }}>تم إرسال بيانات الدخول على إيميلك</p>
                <div style={{ borderTop: `1px solid ${COLORS.border}` }} className="pt-3 space-y-2">
                  <p className="text-sm"><span style={{ color: COLORS.muted }}>الباقة:</span> <span className="font-medium" style={{ color: COLORS.text }}>{selectedPackage.name}</span></p>
                  <p className="text-sm"><span style={{ color: COLORS.muted }}>الإيميل:</span> <span className="font-medium" style={{ color: COLORS.text }} dir="ltr">{clientForm.email}</span></p>
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

  /* ═══════════════════════════════════════════════════
     PREMIUM LANDING PAGE
     ═══════════════════════════════════════════════════ */

  const initials = profile.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "";

  const clientCount = 0; // Will be populated from achievements stats

  return (
    <div className="min-h-screen" dir="rtl" style={{ backgroundColor: COLORS.bg, fontFamily: "Tajawal, sans-serif" }}>
      <TrainerPageSEO
        fullName={profile.full_name}
        city={city}
        specialization={profile.specialization}
        bio={profile.bio}
        avatarUrl={profile.avatar_url}
        username={username || ""}
        clientCount={clientCount}
      />

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes tp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes tp-pulse-ring { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.8); opacity: 0; } }
        .tp-float { animation: tp-float 3s ease-in-out infinite; }
        .tp-pulse-ring { animation: tp-pulse-ring 2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .tp-float, .tp-pulse-ring { animation: none !important; } }
      `}</style>

      {/* ─── STICKY HEADER ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? `${COLORS.bg}e8` : "transparent",
          backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
          borderBottom: scrolled ? `1px solid ${COLORS.border}` : "1px solid transparent",
          transform: scrolled ? "translateY(0)" : "translateY(0)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ backgroundColor: `${brandColor}18`, color: brandColor }}>{initials}</div>
            )}
            <span className="font-bold text-sm" style={{ color: scrolled ? COLORS.text : `${COLORS.text}90`, transition: "color 300ms" }}>{profile.full_name}</span>
          </div>
          <div className="flex items-center gap-2">
            {packages.length > 0 && (
              <button
                onClick={scrollToPackages}
                className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: scrolled ? brandColor : "transparent",
                  color: scrolled ? "#fff" : brandColor,
                  border: scrolled ? "none" : `1px solid ${brandColor}40`,
                  boxShadow: scrolled ? `0 0 24px ${brandColor}30` : "none",
                }}
              >
                اشترك الآن
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
         SECTION 1: HERO
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("hero") && (
        <section className="relative min-h-screen flex items-center overflow-hidden">
          {/* Cover image background OR ambient effects */}
          {pc.cover_image_url ? (
            <>
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${pc.cover_image_url})` }} />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${COLORS.bg}e0 0%, ${COLORS.bg}b0 40%, ${COLORS.bg}e8 100%)` }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 80% 60% at 75% 40%, ${brandColor}08 0%, transparent 70%)` }} />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 50% at 20% 80%, ${brandColor}06 0%, transparent 60%)` }} />
              {/* Grid texture */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${COLORS.text} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.text} 1px, transparent 1px)`, backgroundSize: "80px 80px" }} />
            </>
          )}
          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: `linear-gradient(to top, ${COLORS.bg}, transparent)` }} />

          <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative w-full">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              {/* Profile image - circular with green glow */}
              <Reveal className="relative order-1 lg:order-2 flex-shrink-0">
                <div className="relative flex items-center justify-center">
                  {/* Green glow behind image */}
                  <div className="absolute w-[280px] h-[280px] lg:w-[340px] lg:h-[340px] rounded-full blur-[80px]" style={{ backgroundColor: `${brandColor}18` }} />
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="relative w-[280px] h-[280px] lg:w-[340px] lg:h-[340px] rounded-full object-cover"
                      style={{ border: `3px solid ${brandColor}30`, boxShadow: `0 0 60px ${brandColor}15, 0 0 120px ${brandColor}08, 0 40px 80px rgba(0,0,0,0.5)` }}
                    />
                  ) : (
                    <div
                      className="relative w-[280px] h-[280px] lg:w-[340px] lg:h-[340px] rounded-full flex items-center justify-center text-7xl lg:text-8xl font-black"
                      style={{ backgroundColor: `${COLORS.card}`, color: brandColor, border: `3px solid ${brandColor}30`, boxShadow: `0 0 60px ${brandColor}15, 0 0 120px ${brandColor}08` }}
                    >
                      {initials}
                    </div>
                  )}
                  {/* Availability badge */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5 backdrop-blur-xl flex items-center gap-2" style={{ backgroundColor: `${COLORS.card}e6`, border: `1px solid ${COLORS.border}` }}>
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full tp-pulse-ring" style={{ backgroundColor: brandColor }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: COLORS.text }}>متاح للاشتراك</span>
                  </div>
                </div>
              </Reveal>

              {/* Content side */}
              <Reveal delay={150} className="flex-1 text-center lg:text-right order-2 lg:order-1">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8" style={{ backgroundColor: `${brandColor}10`, border: `1px solid ${brandColor}20` }}>
                  <Award className="w-4 h-4" style={{ color: brandColor }} strokeWidth={1.5} />
                  <span className="text-sm font-bold" style={{ color: brandColor }}>
                    مدرب معتمد{city ? ` — ${city}` : ""}
                  </span>
                </div>

                {/* Name */}
                <h1 className="text-5xl md:text-7xl xl:text-[5.5rem] font-black leading-[0.95] tracking-[-0.03em] mb-5" style={{ color: COLORS.text }}>
                  {profile.full_name}
                </h1>

                {/* Title */}
                {profile.title && (
                  <p className="text-xl md:text-2xl font-medium mb-5" style={{ color: `${COLORS.text}70` }}>{profile.title}</p>
                )}

                {/* Bio (2 lines max) */}
                {profile.bio && (
                  <p className="text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 line-clamp-2" style={{ color: COLORS.muted }}>{profile.bio}</p>
                )}

                {/* CTA Buttons */}
                <div className="flex items-center gap-4 justify-center lg:justify-start">
                  {packages.length > 0 && (
                    <button
                      onClick={scrollToPackages}
                      className="px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95"
                      style={{ backgroundColor: brandColor, color: "#fff", boxShadow: `0 0 48px ${brandColor}35, 0 20px 40px rgba(0,0,0,0.3)` }}
                    >
                      اشترك الآن
                      <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                    </button>
                  )}
                  {profile.social_links?.whatsapp && (
                    <a href={`https://wa.me/${profile.social_links.whatsapp}`} target="_blank" rel="noopener noreferrer"
                      className="px-6 py-4 rounded-xl font-medium text-base flex items-center gap-2 transition-all duration-300 hover:scale-105"
                      style={{ color: COLORS.text, border: `1px solid ${COLORS.border}`, backgroundColor: `${COLORS.card}80` }}>
                      <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                      تواصل
                    </a>
                  )}
                </div>
              </Reveal>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 tp-float">
            <ChevronDown className="w-6 h-6" style={{ color: COLORS.dim }} strokeWidth={1.5} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 2: STATS BAR
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("stats") && pc.stats && pc.stats.length > 0 && (
        <Reveal>
          <section className="relative" style={{ borderTop: `2px solid ${brandColor}30` }}>
            <div className="max-w-6xl mx-auto px-6 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {pc.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-4xl md:text-5xl font-black mb-2" style={{ color: brandColor }}>{stat.value}</p>
                    <p className="text-sm font-medium" style={{ color: COLORS.muted }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 3: SPECIALIZATIONS
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("specialties") && pc.specialties && pc.specialties.length > 0 && (
        <section className="px-6 py-20" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12" style={{ color: COLORS.text }}>التخصصات</h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex flex-wrap justify-center gap-3">
                {pc.specialties.map((s) => (
                  <span
                    key={s}
                    className="px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 cursor-default"
                    style={{ color: brandColor, border: `1px solid ${brandColor}35`, backgroundColor: `${brandColor}08` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 4: ABOUT
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("about") && pc.about_text && (
        <section className="px-6 py-24" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <Reveal>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black mb-8" style={{ color: COLORS.text }}>من أنا؟</h2>
                  <p className="text-lg leading-[1.9] whitespace-pre-wrap" style={{ color: COLORS.muted }}>{pc.about_text}</p>
                  {/* Certifications if specialization exists */}
                  {profile.specialization && (
                    <div className="mt-8 space-y-3">
                      {profile.specialization.split(",").map((cert, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${brandColor}15` }}>
                            <Check className="w-3.5 h-3.5" style={{ color: brandColor }} strokeWidth={2} />
                          </div>
                          <span className="text-sm font-medium" style={{ color: COLORS.text }}>{cert.trim()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
              <Reveal delay={150}>
                {profile.avatar_url ? (
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-[2rem] blur-[40px]" style={{ backgroundColor: `${brandColor}08` }} />
                    <img src={profile.avatar_url} alt={profile.full_name} className="relative w-full max-w-md mx-auto rounded-[2rem] object-cover aspect-[3/4]" style={{ border: `1px solid ${COLORS.border}` }} loading="lazy" />
                  </div>
                ) : (
                  <div className="w-full max-w-md mx-auto rounded-[2rem] aspect-[3/4] flex items-center justify-center" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <Dumbbell className="w-20 h-20" style={{ color: COLORS.dim }} strokeWidth={1} />
                  </div>
                )}
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 5: TRANSFORMATION GALLERY
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("gallery") && galleryUrls.length > 0 && (
        <section className="px-6 py-24" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-14">
                <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: COLORS.text }}>نتائج العملاء</h2>
                <p className="text-lg" style={{ color: COLORS.muted }}>تحولات حقيقية تتحدث عن نفسها</p>
              </div>
            </Reveal>
            <div className="columns-2 lg:columns-3 gap-4 space-y-4">
              {galleryUrls.map((url, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer relative" style={{ backgroundColor: COLORS.card }}>
                    <img src={url} alt="" className="w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 6: PACKAGES
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("packages") && packages.length > 0 && (
        <section ref={packagesRef} className="px-6 py-24" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-14">
                <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: COLORS.text }}>اختر باقتك</h2>
                <p className="text-lg" style={{ color: COLORS.muted }}>استثمر في نفسك اليوم</p>
              </div>
            </Reveal>
            <div className={`grid gap-6 ${packages.length === 1 ? "max-w-md mx-auto" : packages.length === 2 ? "grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-1 lg:grid-cols-3"}`}>
              {packages.map((pkg, idx) => {
                const isFeatured = pc.featured_package_id === pkg.id || (packages.length >= 2 && idx === 1 && !pc.featured_package_id);
                return (
                  <Reveal key={pkg.id} delay={idx * 100}>
                    <div
                      className="rounded-2xl p-7 space-y-6 relative transition-all duration-500 hover:-translate-y-2 group"
                      style={{
                        backgroundColor: isFeatured ? `${brandColor}08` : COLORS.card,
                        border: isFeatured ? `1px solid ${brandColor}40` : `1px solid ${COLORS.border}`,
                        boxShadow: isFeatured ? `0 0 80px ${brandColor}12, 0 30px 60px rgba(0,0,0,0.3)` : `0 20px 40px rgba(0,0,0,0.15)`,
                      }}
                    >
                      {isFeatured && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-black" style={{ backgroundColor: brandColor, color: "#fff" }}>
                          الأكثر طلباً
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-xl mb-1" style={{ color: COLORS.text }}>{pkg.name}</h3>
                        {pkg.description && <p className="text-sm" style={{ color: COLORS.muted }}>{pkg.description}</p>}
                      </div>
                      <div>
                        <span className="text-5xl font-black" style={{ color: isFeatured ? brandColor : COLORS.text }}>{pkg.price}</span>
                        <span className="text-sm mr-2" style={{ color: COLORS.muted }}>ر.س/{pkg.billing_cycle === "quarterly" ? "3 شهور" : pkg.billing_cycle === "yearly" ? "سنة" : "شهر"}</span>
                      </div>
                      <div className="space-y-3 py-2">
                        {pkg.sessions_per_week > 0 && <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.muted }}><Check className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} strokeWidth={2} /><span>{pkg.sessions_per_week} جلسات أسبوعياً</span></div>}
                        {pkg.includes_program && <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.muted }}><Check className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} strokeWidth={2} /><span>برنامج تدريب</span></div>}
                        {pkg.includes_nutrition && <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.muted }}><Check className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} strokeWidth={2} /><span>جدول غذائي</span></div>}
                        {pkg.includes_followup && <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.muted }}><Check className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} strokeWidth={2} /><span>متابعة يومية</span></div>}
                        {pkg.custom_features?.map((f, i) => <div key={i} className="flex items-center gap-3 text-sm" style={{ color: COLORS.muted }}><Check className="w-4 h-4 flex-shrink-0" style={{ color: brandColor }} strokeWidth={2} /><span>{f}</span></div>)}
                      </div>
                      <button
                        className="w-full py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: isFeatured ? brandColor : "transparent",
                          border: isFeatured ? "none" : `1px solid ${COLORS.border}`,
                          color: isFeatured ? "#fff" : COLORS.text,
                          boxShadow: isFeatured ? `0 0 32px ${brandColor}25` : "none",
                        }}
                        onClick={() => handleSelectPackage(pkg)}
                      >
                        اشترك الآن <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 7: TESTIMONIALS
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("testimonials") && pc.testimonials && pc.testimonials.length > 0 && (
        <section className="px-6 py-24" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <div className="text-center mb-14">
                <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: COLORS.text }}>ماذا يقول عملائي</h2>
              </div>
            </Reveal>
            <div className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              {pc.testimonials.map((tm, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div
                    className="min-w-[320px] max-w-[360px] rounded-2xl p-7 flex-shrink-0 snap-start transition-all duration-300 hover:-translate-y-1"
                    style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
                  >
                    {/* Stars */}
                    <div className="flex gap-1 mb-5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`w-4 h-4 ${j < tm.rating ? "fill-amber-400 text-amber-400" : ""}`} style={{ color: j < tm.rating ? undefined : `${COLORS.text}15` }} strokeWidth={1.5} />
                      ))}
                    </div>
                    <p className="text-base leading-relaxed mb-6" style={{ color: `${COLORS.text}cc` }}>"{tm.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black" style={{ backgroundColor: `${brandColor}12`, color: brandColor }}>
                        {tm.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: COLORS.text }}>{tm.name}</p>
                        {tm.result && <p className="text-xs font-medium" style={{ color: brandColor }}>{tm.result}</p>}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         SECTION 8: FINAL CTA
         ═══════════════════════════════════════════════ */}
      {!hiddenSections.includes("cta") && (
        <section className="px-6 py-24">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <div
                className="relative rounded-[2rem] p-12 md:p-20 text-center overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${brandColor}18 0%, ${brandColor}06 50%, ${COLORS.bg} 100%)`, border: `1px solid ${brandColor}20` }}
              >
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px]" style={{ backgroundColor: `${brandColor}10` }} />
                <div className="relative">
                  <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: COLORS.text }}>جاهز تبدأ رحلتك؟</h2>
                  <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: COLORS.muted }}>
                    {pc.cta_subtitle || "انضم لمئات العملاء الذين غيّروا حياتهم"}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {packages.length > 0 && (
                      <button
                        onClick={scrollToPackages}
                        className="px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                        style={{ backgroundColor: brandColor, color: "#fff", boxShadow: `0 0 48px ${brandColor}30` }}
                      >
                        اشترك الآن
                        <ArrowLeft className="w-5 h-5" strokeWidth={2} />
                      </button>
                    )}
                    {profile.social_links?.whatsapp && (
                      <a href={`https://wa.me/${profile.social_links.whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="px-8 py-4 rounded-xl font-medium text-base flex items-center gap-2 transition-all duration-300 hover:scale-105"
                        style={{ color: COLORS.text, border: `1px solid ${COLORS.border}`, backgroundColor: `${COLORS.card}80` }}>
                        <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                        تواصل واتساب
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
         FOOTER
         ═══════════════════════════════════════════════ */}
      <footer className="px-6 py-10" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" style={{ color: brandColor }} strokeWidth={1.5} />
            <span className="text-xs font-medium" style={{ color: COLORS.dim }}>Powered by CoachBase</span>
          </div>
          {/* Social links */}
          {profile.social_links && (
            <div className="flex items-center gap-4">
              {profile.social_links.instagram && (
                <a href={`https://instagram.com/${profile.social_links.instagram}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: COLORS.dim }}>
                  <Instagram className="w-4.5 h-4.5" strokeWidth={1.5} />
                </a>
              )}
              {profile.social_links.twitter && (
                <a href={`https://twitter.com/${profile.social_links.twitter}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: COLORS.dim }}>
                  <Twitter className="w-4.5 h-4.5" strokeWidth={1.5} />
                </a>
              )}
              {profile.social_links.website && (
                <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: COLORS.dim }}>
                  <Globe className="w-4.5 h-4.5" strokeWidth={1.5} />
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs transition-colors hover:opacity-80" style={{ color: COLORS.dim }}>سياسة الخصوصية</Link>
            <Link to="/terms" className="text-xs transition-colors hover:opacity-80" style={{ color: COLORS.dim }}>الشروط</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TrainerPublicPage;
