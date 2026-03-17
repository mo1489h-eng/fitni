import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell, Loader2, CheckCircle, ArrowDown, MapPin,
  Instagram, Twitter, ChevronLeft, CreditCard, User, Eye, EyeOff,
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

const MOYASAR_PUBLISHABLE_KEY = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const TrainerPublicPage = () => {
  const { username } = useParams();
  const [selectedPackage, setSelectedPackage] = useState<TrainerPackage | null>(null);
  const [step, setStep] = useState(0); // 0 = viewing, 1 = info, 2 = account, 3 = payment, 4 = success
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const moyasarRef = useRef<HTMLDivElement>(null);
  const moyasarInitRef = useRef(false);
  const packagesRef = useRef<HTMLDivElement>(null);

  const [clientForm, setClientForm] = useState({
    full_name: "",
    phone: "",
    age: "",
    weight: "",
    height: "",
    goal: "تخسيس",
    notes: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-trainer", username],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trainer_by_username" as any, {
        p_username: username!,
      });
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
        .from("trainer_packages")
        .select("*")
        .eq("trainer_id", profile!.user_id)
        .eq("is_active", true)
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
        if (path.startsWith("http")) {
          urls.push(path);
        } else {
          const { data } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) urls.push(data.signedUrl);
        }
      }
      return urls;
    },
    enabled: !!profile?.gallery_images?.length,
  });

  const scrollToPackages = () => {
    packagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectPackage = (pkg: TrainerPackage) => {
    setSelectedPackage(pkg);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInfoNext = () => {
    if (!clientForm.full_name.trim() || !clientForm.phone.trim()) return;
    setStep(2);
  };

  const handleAccountNext = () => {
    if (!clientForm.email.trim() || clientForm.password.length < 6) return;
    if (clientForm.password !== clientForm.confirm_password) return;
    setStep(3);
  };

  // Initialize Moyasar when step=3
  useEffect(() => {
    if (step !== 3 || !selectedPackage || moyasarInitRef.current) return;

    const loadMoyasar = () => {
      if (!document.getElementById("moyasar-css")) {
        const link = document.createElement("link");
        link.id = "moyasar-css";
        link.rel = "stylesheet";
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
          apple_pay: {
            country: "SA",
            label: "fitni",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
          on_completed: async (payment: any) => {
            if (payment.status === "paid") {
              await handlePaymentSuccess(payment.id);
            }
          },
        });
      };

      if ((window as any).Moyasar) {
        initForm();
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
        script.onload = initForm;
        document.head.appendChild(script);
      }
    };

    loadMoyasar();
    return () => { moyasarInitRef.current = false; };
  }, [step]);

  const handlePaymentSuccess = async (paymentId: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-client", {
        body: {
          payment_id: paymentId,
          package_id: selectedPackage!.id,
          trainer_id: profile!.user_id,
          client_name: clientForm.full_name.trim(),
          client_phone: clientForm.phone.trim(),
          client_email: clientForm.email.trim(),
          client_password: clientForm.password,
          client_age: clientForm.age ? parseInt(clientForm.age) : null,
          client_weight: clientForm.weight ? parseFloat(clientForm.weight) : null,
          client_height: clientForm.height ? parseFloat(clientForm.height) : null,
          client_goal: clientForm.goal,
          client_notes: clientForm.notes.trim() || null,
          amount: selectedPackage!.price,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "حدث خطأ");
      setStep(4);
    } catch (err: any) {
      console.error("Signup error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
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

  const brandColor = profile.brand_color || "#16a34a";

  // ═══ SIGNUP FLOW ═══
  if (step > 0 && selectedPackage) {
    return (
      <div className="min-h-screen bg-[#080808]" dir="rtl">
        <header className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-md border-b border-border/30 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => { setStep(step > 1 ? step - 1 : 0); moyasarInitRef.current = false; }} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
            <span className="text-sm text-muted-foreground">الخطوة {step} من 4</span>
            <div className="flex gap-1">
              {[1,2,3,4].map(s => (
                <div key={s} className={`w-6 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">معلوماتك الشخصية</h2>
                <p className="text-sm text-muted-foreground mt-1">باقة {selectedPackage.name} — {selectedPackage.price} ر.س/شهر</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">الاسم الكامل *</label>
                  <Input value={clientForm.full_name} onChange={e => setClientForm({...clientForm, full_name: e.target.value})} placeholder="اسمك الكامل" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">رقم الجوال *</label>
                  <Input value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} placeholder="05XXXXXXXX" type="tel" dir="ltr" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">العمر</label>
                    <Input value={clientForm.age} onChange={e => setClientForm({...clientForm, age: e.target.value})} type="number" placeholder="25" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">الوزن (كجم)</label>
                    <Input value={clientForm.weight} onChange={e => setClientForm({...clientForm, weight: e.target.value})} type="number" placeholder="75" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">الطول (سم)</label>
                    <Input value={clientForm.height} onChange={e => setClientForm({...clientForm, height: e.target.value})} type="number" placeholder="175" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">الهدف</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل"].map(g => (
                      <button
                        key={g}
                        onClick={() => setClientForm({...clientForm, goal: g})}
                        className={`px-4 py-2 rounded-full text-sm border transition-colors ${clientForm.goal === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">ملاحظات إضافية</label>
                  <Textarea value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes: e.target.value})} placeholder="إصابات سابقة، أمراض مزمنة..." rows={3} maxLength={500} />
                </div>
              </div>

              <Button className="w-full" onClick={handleInfoNext} disabled={!clientForm.full_name.trim() || !clientForm.phone.trim()}>
                التالي ←
              </Button>
            </div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">إنشاء حسابك</h2>
                <p className="text-sm text-muted-foreground mt-1">للوصول لبوابة التدريب الخاصة بك</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">البريد الإلكتروني *</label>
                  <Input value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} placeholder="email@example.com" type="email" dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">كلمة المرور *</label>
                  <div className="relative">
                    <Input value={clientForm.password} onChange={e => setClientForm({...clientForm, password: e.target.value})} placeholder="6 أحرف على الأقل" type={showPassword ? "text" : "password"} dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">تأكيد كلمة المرور *</label>
                  <div className="relative">
                    <Input value={clientForm.confirm_password} onChange={e => setClientForm({...clientForm, confirm_password: e.target.value})} placeholder="أعد كتابة كلمة المرور" type={showConfirmPassword ? "text" : "password"} dir="ltr" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {clientForm.confirm_password && clientForm.password !== clientForm.confirm_password && (
                    <p className="text-xs text-destructive mt-1">كلمة المرور غير متطابقة</p>
                  )}
                </div>
              </div>

              <Button className="w-full" onClick={handleAccountNext} disabled={!clientForm.email.trim() || clientForm.password.length < 6 || clientForm.password !== clientForm.confirm_password}>
                التالي — الدفع ←
              </Button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">إتمام الدفع</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedPackage.price} ر.س — {selectedPackage.name}</p>
              </div>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>ادفع بالبطاقة الائتمانية أو Apple Pay</span>
                </div>
                {submitting ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">جاري إنشاء حسابك...</p>
                  </div>
                ) : (
                  <div ref={moyasarRef} className="moyasar-form" />
                )}
              </Card>
              <p className="text-xs text-muted-foreground text-center">الدفع آمن ومشفر عبر Moyasar 🔒</p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-6 py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">تم الاشتراك بنجاح! 🎉</h2>
                <p className="text-muted-foreground">
                  مرحباً {clientForm.full_name} في رحلتك مع {profile.full_name}
                </p>
              </div>
              <Card className="p-4 text-sm text-right space-y-2">
                <p className="text-muted-foreground">تم إرسال بيانات دخولك على إيميلك</p>
                <Separator />
                <p><span className="text-muted-foreground">الباقة:</span> <span className="font-medium text-foreground">{selectedPackage.name}</span></p>
                <p><span className="text-muted-foreground">الإيميل:</span> <span className="font-medium text-foreground" dir="ltr">{clientForm.email}</span></p>
              </Card>
              <Button className="w-full" onClick={() => window.location.href = "/client-login"}>
                ادخل لبوابتك الآن ←
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ═══ LANDING PAGE ═══
  return (
    <div className="min-h-screen bg-[#080808]" dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-lg mx-auto px-4 pt-12 pb-8 relative">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="" className="h-8 w-auto" />
            ) : (
              <>
                <Dumbbell className="w-5 h-5 text-primary" />
                <span className="font-black text-foreground">fitni</span>
              </>
            )}
          </div>

          {/* Profile */}
          <div className="flex flex-col items-center text-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-28 h-28 rounded-full object-cover border-4 mb-4"
                style={{ borderColor: brandColor }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-4 text-3xl font-bold text-primary-foreground" style={{ backgroundColor: brandColor }}>
                {profile.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
            )}

            <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
            {profile.title && (
              <p className="text-sm text-muted-foreground mt-1">{profile.title}</p>
            )}
            {profile.specialization && (
              <Badge className="mt-2" style={{ backgroundColor: `${brandColor}20`, color: brandColor, borderColor: brandColor }}>
                {profile.specialization}
              </Badge>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-4 max-w-sm leading-relaxed">{profile.bio}</p>
            )}

            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div className="flex gap-3 mt-4">
                {(profile.social_links as Record<string, string>).instagram && (
                  <a href={`https://instagram.com/${(profile.social_links as Record<string, string>).instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {(profile.social_links as Record<string, string>).twitter && (
                  <a href={`https://twitter.com/${(profile.social_links as Record<string, string>).twitter}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {packages.length > 0 && (
              <Button className="mt-6 gap-2" onClick={scrollToPackages} style={{ backgroundColor: brandColor }}>
                اشترك الآن
                <ArrowDown className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Gallery */}
      {galleryUrls.length > 0 && (
        <section className="max-w-lg mx-auto px-4 py-8">
          <h2 className="text-lg font-bold text-foreground mb-4">المعرض 📸</h2>
          <div className="grid grid-cols-2 gap-2">
            {galleryUrls.map((url, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Packages */}
      {packages.length > 0 && (
        <section ref={packagesRef} className="max-w-lg mx-auto px-4 py-8">
          <h2 className="text-lg font-bold text-foreground mb-4">اختر باقتك 💪</h2>
          <div className="space-y-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="p-5 space-y-4 border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{pkg.name}</h3>
                    {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold" style={{ color: brandColor }}>{pkg.price}</p>
                    <p className="text-xs text-muted-foreground">ر.س/شهر</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {pkg.sessions_per_week > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>{pkg.sessions_per_week} جلسات أسبوعياً</span>
                    </div>
                  )}
                  {pkg.includes_program && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>برنامج تدريب</span>
                    </div>
                  )}
                  {pkg.includes_nutrition && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>جدول غذائي</span>
                    </div>
                  )}
                  {pkg.includes_followup && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>متابعة يومية</span>
                    </div>
                  )}
                  {pkg.custom_features?.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button className="w-full" onClick={() => handleSelectPackage(pkg)} style={{ backgroundColor: brandColor }}>
                  اشترك الآن ←
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Dumbbell className="w-4 h-4" />
          <span className="text-xs">مدعوم من fitni</span>
        </div>
      </footer>
    </div>
  );
};

export default TrainerPublicPage;
