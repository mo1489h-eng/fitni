import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CirclePlay,
  CreditCard,
  Dumbbell,
  FileText,
  Instagram,
  Linkedin,
  Menu,
  MessageSquareText,
  Receipt,
  Sparkles,
  Twitter,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import AnimatedCounter from "@/components/AnimatedCounter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useAuth } from "@/hooks/useAuth";

type Feature = {
  number: string;
  title: string;
  description: string;
  id: string;
};

const navLinks = [
  { label: "المميزات", href: "#features" },
  { label: "التسعير", href: "#pricing" },
  { label: "تسجيل الدخول", href: "/login", isRoute: true },
];

const socialProofStats = [
  { value: 500, suffix: "+", label: "مدرب" },
  { value: 10000, suffix: "+", label: "متدرب" },
  { value: 1, prefix: "", suffix: "M+", label: "تمرين مكتمل" },
];

const features: Feature[] = [
  {
    number: "01",
    title: "إدارة العملاء",
    description: "كل عملاءك في مكان واحد، بروفايل كامل، تقدم حقيقي، ومتابعة دقيقة بدون تشتيت.",
    id: "clients",
  },
  {
    number: "02",
    title: "برامج تدريب ذكية",
    description: "ابنِ برامج احترافية بسرعة، أو دع الذكاء الاصطناعي يقترح الهيكل الأمثل لكل عميل.",
    id: "programs",
  },
  {
    number: "03",
    title: "مدفوعات أونلاين",
    description: "استقبل المدفوعات بسهولة عبر مدى، فيزا، وApple Pay مع وضوح كامل لحالة كل اشتراك.",
    id: "payments",
  },
  {
    number: "04",
    title: "بورتال المتدرب",
    description: "كل عميل لديه بورتال خاص يشاهد منه برنامجه، يسجل تمارينه، ويتابع تقدمه أسبوعياً.",
    id: "portal",
  },
];

const testimonials = [
  {
    name: "أحمد المطيري",
    role: "مدرب تحول جسماني",
    quote:
      "fitni نقلني من إدارة مشتتة بين الرسائل والجداول إلى نظام واضح يجعل العميل يشعر أن لدي فريقاً كاملاً خلفه.",
  },
  {
    name: "ريم الدوسري",
    role: "مدربة لياقة نسائية",
    quote:
      "أكثر شيء أحببته هو تجربة العميل نفسها. البورتال مرتب، والخطة الغذائية والبرنامج يظهران بشكل احترافي جداً.",
  },
  {
    name: "خالد العتيبي",
    role: "مدرب أداء رياضي",
    quote:
      "المدفوعات والمتابعة الأسبوعية كانت تستهلك وقتي. الآن أعرف من دفع ومن تأخر ومن يحتاج تواصل خلال ثوانٍ.",
  },
];

const planFeatures = {
  basic: ["حتى 10 عملاء", "برامج تدريب كاملة", "خطة غذائية لكل عميل", "جلسات وتقويم"],
  pro: ["عملاء غير محدودين", "AI Copilot", "بوابة متدرب كاملة", "مدفوعات ومتابعة متقدمة"],
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
};

const useInView = <T extends HTMLElement>(threshold = 0.2) => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
};

const Reveal = ({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => {
  const { ref, visible } = useInView<HTMLDivElement>(0.15);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,24px,0)",
        transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) => (
  <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-xl"}>
    <Badge className="mb-5 rounded-full border border-primary/25 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
      {eyebrow}
    </Badge>
    <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-foreground md:text-6xl">{title}</h2>
    {description ? <p className="mt-5 text-lg leading-8 text-foreground/65">{description}</p> : null}
  </div>
);

const DeviceShell = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={`rounded-[2rem] border border-border bg-card/90 p-3 shadow-[0_0_0_1px_hsl(var(--border)),0_30px_90px_hsl(var(--primary)/0.12)] backdrop-blur ${className}`}
  >
    <div className="overflow-hidden rounded-[1.55rem] border border-border bg-background">{children}</div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card/70 px-4 py-3">
    <div className="text-xl font-black text-foreground">{value}</div>
    <div className="mt-1 text-xs text-foreground/50">{label}</div>
  </div>
);

const DashboardMockup = ({ parallax = 0 }: { parallax?: number }) => (
  <div className="relative mx-auto max-w-5xl">
    <div className="absolute inset-x-10 bottom-0 h-28 rounded-full bg-primary/20 blur-3xl" />
    <DeviceShell
      className="relative landing-float"
      style={undefined as never}
    >
      <div
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_30%)]"
        style={{ transform: `translate3d(0, ${parallax}px, 0)` }}
      >
        <div className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
          <div className="text-sm font-medium text-foreground/55">لوحة تحكم fitni</div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
            مباشر الآن
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <MiniStat label="العملاء النشطون" value="128" />
              <MiniStat label="الاشتراكات" value="92%" />
              <MiniStat label="المهام اليوم" value="14" />
            </div>
            <Card className="overflow-hidden border-border bg-card/80">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <div className="text-lg font-bold text-foreground">أداء الأسبوع</div>
                    <div className="text-sm text-foreground/50">نشاط العملاء والمدفوعات</div>
                  </div>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="grid h-56 grid-cols-12 items-end gap-2 px-5 pb-5 pt-8">
                  {[28, 46, 35, 62, 54, 70, 82, 66, 88, 76, 92, 98].map((height, index) => (
                    <div key={index} className="flex h-full items-end">
                      <div
                        className="w-full rounded-t-full bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--primary)/0.18))]"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-border bg-card/85">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">العملاء</div>
                    <div className="text-sm text-foreground/50">أحدث التحديثات</div>
                  </div>
                  <Users className="h-5 w-5 text-primary" />
                </div>
                {[
                  { name: "سارة", status: "أكملت التمرين" },
                  { name: "تركي", status: "رفع قياسات جديدة" },
                  { name: "لولوة", status: "دفع الاشتراك" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-sm text-foreground/50">{item.status}</div>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/85">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">الإيراد الشهري</div>
                    <div className="text-sm text-foreground/50">محصل تلقائياً</div>
                  </div>
                  <WalletCards className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-black text-foreground">18,420 ر.س</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DeviceShell>
  </div>
);

const ProblemPanel = ({
  variant,
  title,
  items,
}: {
  variant: "before" | "after";
  title: string;
  items: string[];
}) => {
  const before = variant === "before";

  return (
    <Card
      className={`relative overflow-hidden border-border/80 ${before ? "bg-card" : "bg-card/80"}`}
    >
      <div
        className={`absolute inset-0 opacity-100 ${
          before
            ? "bg-[radial-gradient(circle_at_top_left,hsl(var(--destructive)/0.16),transparent_45%)]"
            : "bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_45%)]"
        }`}
      />
      <CardContent className="relative p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`rounded-2xl border p-3 ${
              before
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/10 text-primary"
            }`}
          >
            {before ? <MessageSquareText className="h-6 w-6" /> : <BarChart3 className="h-6 w-6" />}
          </div>
          <div>
            <div className="text-sm text-foreground/45">{before ? "قبل fitni" : "مع fitni"}</div>
            <h3 className="text-3xl font-black text-foreground">{title}</h3>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          {before ? (
            <>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                <MessageSquareText className="mb-8 h-8 w-8 text-destructive" />
                <div className="h-2 w-14 rounded-full bg-destructive/40" />
              </div>
              <div className="rounded-2xl border border-destructive/20 bg-background/70 p-4">
                <FileText className="mb-8 h-8 w-8 text-foreground/40" />
                <div className="h-2 w-full rounded-full bg-foreground/10" />
              </div>
              <div className="rounded-2xl border border-destructive/20 bg-background/70 p-4">
                <Receipt className="mb-8 h-8 w-8 text-foreground/40" />
                <div className="h-2 w-10 rounded-full bg-foreground/10" />
              </div>
            </>
          ) : (
            <div className="col-span-3 rounded-[1.75rem] border border-primary/20 bg-background/80 p-4 shadow-[0_20px_60px_hsl(var(--primary)/0.12)]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <div className="mb-5 text-sm text-foreground/50">العملاء</div>
                  <div className="text-2xl font-black text-foreground">42</div>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <div className="mb-5 text-sm text-foreground/50">الاشتراكات</div>
                  <div className="text-2xl font-black text-foreground">18</div>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-4">
                  <div className="mb-5 text-sm text-foreground/50">المهام</div>
                  <div className="text-2xl font-black text-foreground">09</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 text-lg text-foreground/78">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  before
                    ? "border-destructive/25 bg-destructive/10 text-destructive"
                    : "border-primary/25 bg-primary/10 text-primary"
                }`}
              >
                {before ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ClientsVisual = () => (
  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
    <Card className="border-border bg-card/80">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">قائمة العملاء</div>
            <div className="text-sm text-foreground/45">نشاط مباشر</div>
          </div>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-3">
          {[
            { name: "سارة", tag: "أسبوع 6" },
            { name: "عبدالله", tag: "خطة جديدة" },
            { name: "دانة", tag: "دفعة مكتملة" },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3">
              <div>
                <div className="font-semibold text-foreground">{item.name}</div>
                <div className="text-sm text-foreground/45">{item.tag}</div>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="border-border bg-card/80">
      <CardContent className="p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">ملف العميل</div>
            <div className="text-sm text-foreground/45">تقدم، قياسات، التزام</div>
          </div>
          <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            نشط
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniStat label="الالتزام" value="94%" />
          <MiniStat label="الوزن" value="-5.2 كجم" />
          <MiniStat label="الجلسات" value="18" />
          <MiniStat label="آخر تحديث" value="اليوم" />
        </div>
      </CardContent>
    </Card>
  </div>
);

const ProgramsVisual = () => (
  <Card className="overflow-hidden border-border bg-card/80">
    <CardContent className="p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="font-bold text-foreground">Program Builder</div>
          <div className="text-sm text-foreground/45">Week 1 · Upper / Lower Split</div>
        </div>
        <Zap className="h-5 w-5 text-primary" />
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          {[
            "اليوم 1 · دفع علوي",
            "اليوم 2 · سحب علوي",
            "اليوم 3 · رجلين",
          ].map((day, index) => (
            <div
              key={day}
              className={`rounded-2xl border px-4 py-3 ${index === 0 ? "border-primary/30 bg-primary/10" : "border-border bg-background/70"}`}
            >
              <div className="font-semibold text-foreground">{day}</div>
              <div className="text-sm text-foreground/45">6 تمارين</div>
            </div>
          ))}
        </div>
        <div className="rounded-[1.5rem] border border-border bg-background/75 p-4">
          <div className="space-y-3">
            {[
              "Bench Press · 4 × 8",
              "Incline Dumbbell Press · 3 × 10",
              "Cable Fly · 3 × 12",
              "Shoulder Press · 4 × 8",
            ].map((exercise, index) => (
              <div key={exercise} className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3">
                <span className="font-medium text-foreground">{exercise}</span>
                <span className="text-sm text-foreground/45">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PaymentsVisual = () => (
  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">الحركة المالية</div>
            <div className="text-sm text-foreground/45">مدفوعات، تجديدات، تنبيهات</div>
          </div>
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div className="rounded-[1.75rem] border border-primary/20 bg-primary/10 p-5">
          <div className="text-sm text-foreground/55">هذا الشهر</div>
          <div className="mt-2 text-4xl font-black text-foreground">24,960 ر.س</div>
        </div>
        <div className="space-y-3">
          {["اشتراك سارة · مكتمل", "اشتراك خالد · بانتظار", "جلسة ريم · Apple Pay"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border border-border bg-background/75 px-4 py-3">
              <span className="text-foreground/78">{item}</span>
              <Check className="h-4 w-4 text-primary" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <DeviceShell className="max-w-sm">
      <div className="space-y-4 bg-card/80 p-5">
        <div className="text-center">
          <div className="text-sm text-foreground/45">Payment Options</div>
          <div className="mt-2 text-2xl font-black text-foreground">مدى · Visa · Apple Pay</div>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-background p-4">
          <div className="mb-4 text-sm text-foreground/50">Apple Pay</div>
          <div className="mb-5 h-24 rounded-[1.25rem] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.14),hsl(var(--background)))]" />
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-foreground">69 ر.س</div>
            <div className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Instant
            </div>
          </div>
        </div>
      </div>
    </DeviceShell>
  </div>
);

const PortalVisual = () => (
  <div className="mx-auto max-w-sm">
    <DeviceShell>
      <div className="bg-card/80 p-4">
        <div className="mb-4 rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
          <div className="text-sm text-foreground/50">Portal Home</div>
          <div className="mt-1 text-2xl font-black text-foreground">أهلاً سارة</div>
        </div>
        <div className="space-y-3">
          {[
            "برنامج اليوم · Push Day",
            "الخطة الغذائية · 2,100 kcal",
            "التقرير الأسبوعي · جاهز",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background/75 px-4 py-3">
              <div className="font-medium text-foreground">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </DeviceShell>
  </div>
);

const FeatureVisual = ({ id }: { id: string }) => {
  if (id === "clients") return <ClientsVisual />;
  if (id === "programs") return <ProgramsVisual />;
  if (id === "payments") return <PaymentsVisual />;
  return <PortalVisual />;
};

const Landing = () => {
  const { user, loading } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [copilotStep, setCopilotStep] = useState(0);
  const statsInView = useInView<HTMLDivElement>(0.35);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      setCopilotStep((current) => (current + 1) % 4);
    }, 1600);
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  const heroParallax = useMemo(() => (prefersReducedMotion ? 0 : Math.min(scrollY * 0.08, 30)), [prefersReducedMotion, scrollY]);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes landing-float {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-12px,0); }
        }
        @keyframes landing-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        .landing-float { animation: landing-float 7s ease-in-out infinite; }
        .landing-marquee { animation: landing-marquee 22s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .landing-float, .landing-marquee { animation: none !important; }
        }
      `}</style>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-border bg-background/80 backdrop-blur-2xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-primary">fitni</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) =>
              item.isRoute ? (
                <Link key={item.label} to={item.href} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground">
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" className="rounded-full text-foreground/75 hover:bg-card hover:text-foreground">
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild className="rounded-full px-6 text-base font-bold shadow-[0_16px_50px_hsl(var(--primary)/0.28)]">
              <Link to="/register">ابدأ مجاناً</Link>
            </Button>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 md:hidden"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-2xl md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>
                المميزات
              </a>
              <a href="#pricing" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>
                التسعير
              </a>
              <Link to="/login" className="rounded-2xl border border-border bg-card/70 px-4 py-3 text-foreground/80" onClick={() => setMobileMenuOpen(false)}>
                تسجيل الدخول
              </Link>
              <Button asChild className="h-12 rounded-2xl text-base font-bold">
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  ابدأ مجاناً
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-28 md:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_88%,hsl(var(--primary)/0.2),transparent_28%),radial-gradient(circle_at_top,hsl(var(--foreground)/0.04),transparent_35%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:96px_96px]" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <Reveal className="max-w-3xl">
              <Badge className="mb-6 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
                المنصة الأولى للمدربين الشخصيين في السعودية
              </Badge>
              <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-foreground md:text-7xl xl:text-[5.6rem]">
                تحكّم في عملك
                <br />
                كمدرب محترف
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground/60 md:text-2xl md:leading-10">
                أدر عملاءك، برامجك، ومدفوعاتك في منصة واحدة مصممة لك بجودة تجربة تليق بعلامة fitness tech premium.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild className="h-14 rounded-full px-8 text-lg font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.3)]">
                  <Link to="/register" className="inline-flex items-center gap-2">
                    ابدأ مجاناً
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-14 rounded-full border-border bg-card/40 px-8 text-lg text-foreground hover:bg-card">
                  <a href="#problem" className="inline-flex items-center gap-2">
                    شاهد كيف تعمل
                    <CirclePlay className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <DashboardMockup parallax={heroParallax} />
            </Reveal>
          </div>
        </section>

        <section ref={statsInView.ref} className="border-y border-border bg-card/60 px-4 py-5 backdrop-blur md:px-6">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-full border border-border bg-background/80 py-3">
            <div className="landing-marquee flex min-w-max items-center gap-16 px-8 text-sm font-semibold text-foreground/55">
              {Array.from({ length: 2 }).flatMap((_, index) =>
                [
                  `انضم لمئات المدربين في السعودية`,
                  `لوحة تحكم احترافية للمدربين`,
                  `تجربة متدرب premium من أول يوم`,
                ].map((text) => <span key={`${text}-${index}`}>{text}</span>),
              )}
            </div>
          </div>

          <div className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-3">
            {socialProofStats.map((stat) => (
              <Card key={stat.label} className="border-border bg-background/70 backdrop-blur">
                <CardContent className="flex items-end justify-between gap-4 p-6">
                  <div>
                    <div className="text-sm text-foreground/45">{stat.label}</div>
                    <div className="mt-3 text-4xl font-black text-foreground md:text-5xl">
                      {statsInView.visible ? (
                        <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                      ) : (
                        "0"
                      )}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="problem" className="relative px-4 py-24 md:px-6 md:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--foreground)/0.03),transparent_35%)]" />
          <div className="relative mx-auto max-w-7xl">
            <Reveal>
              <SectionHeading
                eyebrow="من الفوضى إلى النظام"
                title="نفس الخدمة. تجربة تشغيل مختلفة بالكامل"
                description="كل ما كان يتطلب رسائل، ملفات، وتذكير يدوي، أصبح اليوم منظومة واحدة بوضوح بصري وعملي." 
                centered
              />
            </Reveal>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <Reveal>
                <ProblemPanel
                  variant="before"
                  title="الطريقة القديمة"
                  items={[
                    "فوضى في واتساب",
                    "Excel معقد ومرهق",
                    "مدفوعات منسية",
                    "وقت ضايع في الإدارة",
                  ]}
                />
              </Reveal>
              <Reveal delay={100}>
                <ProblemPanel
                  variant="after"
                  title="تشغيل احترافي"
                  items={[
                    "كل شيء في مكان واحد",
                    "برامج احترافية في دقائق",
                    "مدفوعات تلقائية",
                    "ركّز على التدريب فقط",
                  ]}
                />
              </Reveal>
            </div>
          </div>
        </section>

        <section id="features">
          {features.map((feature, index) => {
            const reverse = index % 2 === 1;
            return (
              <section key={feature.number} className="relative flex min-h-screen items-center border-t border-border px-4 py-24 md:px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_30%)]" />
                <div
                  className={`relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
                >
                  <Reveal>
                    <div className="max-w-xl">
                      <div className="text-7xl font-black leading-none text-primary/18 md:text-8xl">{feature.number}</div>
                      <h2 className="mt-6 text-4xl font-black leading-tight text-foreground md:text-6xl">{feature.title}</h2>
                      <p className="mt-6 text-xl leading-9 text-foreground/60">{feature.description}</p>
                    </div>
                  </Reveal>
                  <Reveal delay={120}>
                    <FeatureVisual id={feature.id} />
                  </Reveal>
                </div>
              </section>
            );
          })}
        </section>

        <section
          className="relative overflow-hidden border-t border-border px-4 py-24 md:px-6 md:py-32"
          style={{ ["--copilot-glow" as string]: "276 62% 46%" } as React.CSSProperties}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--copilot-glow)/0.16),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.18),transparent_34%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <Reveal>
              <Badge className="mb-6 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
                <Sparkles className="ml-2 h-4 w-4" />
                جديد · الذكاء الاصطناعي
              </Badge>
              <h2 className="text-4xl font-black leading-tight text-foreground md:text-6xl">
                كوبايلت الذكاء الاصطناعي
              </h2>
              <p className="mt-6 max-w-xl text-xl leading-9 text-foreground/60">
                أدخل بيانات عميلك واحصل على برنامج تدريب كامل في 8 ثوانٍ، بصياغة واضحة وقابلة للتخصيص فوراً.
              </p>
              <Button asChild className="mt-10 h-14 rounded-full px-8 text-lg font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.28)]">
                <Link to="/register" className="inline-flex items-center gap-2">
                  جرّب الكوبايلت
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            </Reveal>

            <Reveal delay={140}>
              <Card className="overflow-hidden border-border bg-card/85 backdrop-blur">
                <CardContent className="grid gap-0 p-0 md:grid-cols-[0.85fr_1.15fr]">
                  <div className="border-b border-border p-6 md:border-b-0 md:border-l">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-foreground">Client Input</div>
                        <div className="text-sm text-foreground/45">Live AI generation</div>
                      </div>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: "الهدف", active: copilotStep >= 0, value: "زيادة كتلة عضلية" },
                        { label: "الأيام", active: copilotStep >= 1, value: "4 أيام بالأسبوع" },
                        { label: "الخبرة", active: copilotStep >= 2, value: "متوسط" },
                      ].map((field) => (
                        <div key={field.label} className="rounded-2xl border border-border bg-background/80 p-4">
                          <div className="mb-3 text-sm text-foreground/45">{field.label}</div>
                          <div className={`h-11 rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${field.active ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-card text-transparent"}`}>
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-foreground">Generated Program</div>
                        <div className="text-sm text-foreground/45">Week 1 structure</div>
                      </div>
                      <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                        جاهز
                      </div>
                    </div>
                    <div className={`rounded-[1.75rem] border border-primary/20 bg-background/80 p-4 transition-all duration-500 ${copilotStep === 3 ? "shadow-[0_0_60px_hsl(var(--primary)/0.18)]" : ""}`}>
                      <div className="space-y-3">
                        {["Push · 6 تمارين", "Pull · 6 تمارين", "Legs · 7 تمارين", "Upper · 5 تمارين"].map((item) => (
                          <div key={item} className="flex items-center justify-between rounded-2xl border border-border bg-card/75 px-4 py-3">
                            <span className="font-medium text-foreground">{item}</span>
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>

        <section id="pricing" className="border-t border-border px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <SectionHeading
                eyebrow="التسعير"
                title="سعر واحد. كل شيء مشمول"
                description="ابدأ مجاناً لفترة الإطلاق، ثم اختر الباقة المناسبة لنموك بدون تعقيد أو رسوم خفية."
                centered
              />
            </Reveal>

            <Reveal delay={100} className="mx-auto mt-8 max-w-3xl">
              <div className="rounded-[2rem] border border-primary/20 bg-primary/10 px-6 py-4 text-center text-lg font-semibold text-primary">
                مجاني 6 شهور كاملة لأول المسجلين
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <Reveal>
                <Card className="h-full border-border bg-card/85">
                  <CardContent className="p-8">
                    <div className="text-sm text-foreground/45">أساسي</div>
                    <div className="mt-2 text-5xl font-black text-foreground">49 <span className="text-xl text-foreground/45">ريال/شهر</span></div>
                    <p className="mt-4 text-lg text-foreground/60">حتى 10 عملاء</p>
                    <div className="mt-8 space-y-4">
                      {planFeatures.basic.map((item) => (
                        <div key={item} className="flex items-center gap-3 text-foreground/78">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                    <Button asChild className="mt-10 h-14 w-full rounded-full text-base font-bold">
                      <Link to="/register">ابدأ مجاناً</Link>
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal delay={120}>
                <Card className="relative h-full overflow-hidden border-primary/30 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.15),transparent_45%),hsl(var(--card))] shadow-[0_24px_90px_hsl(var(--primary)/0.18)]">
                  <div className="absolute right-6 top-6 rounded-full border border-primary/20 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                    الأكثر شعبية
                  </div>
                  <CardContent className="p-8 pt-20">
                    <div className="text-sm text-foreground/55">احترافي</div>
                    <div className="mt-2 text-5xl font-black text-foreground">69 <span className="text-xl text-foreground/45">ريال/شهر</span></div>
                    <p className="mt-4 text-lg text-foreground/70">عملاء غير محدودين</p>
                    <div className="mt-8 space-y-4">
                      {planFeatures.pro.map((item) => (
                        <div key={item} className="flex items-center gap-3 text-foreground/82">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                    <Button asChild className="mt-10 h-14 w-full rounded-full text-base font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.28)]">
                      <Link to="/register">ابدأ مجاناً</Link>
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="border-t border-border px-4 py-24 md:px-6 md:py-32">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <SectionHeading
                eyebrow="آراء المدربين"
                title="قصص تبدو وكأنها حملة إعلانية… لأنها حقيقية"
                description="انطباع premium من أول نظرة وحتى آخر متابعة أسبوعية. هذا ما يشعر به المدرب والعميل معاً."
                centered
              />
            </Reveal>

            <Reveal delay={100} className="mt-14">
              <Carousel opts={{ align: "start", loop: true }} className="px-4 md:px-14">
                <CarouselContent>
                  {testimonials.map((testimonial) => (
                    <CarouselItem key={testimonial.name} className="md:basis-1/2 xl:basis-1/3">
                      <Card className="h-full border-border bg-card/85">
                        <CardContent className="flex h-full flex-col p-8">
                          <div className="text-6xl font-black leading-none text-primary/18">“</div>
                          <p className="mt-4 flex-1 text-lg leading-8 text-foreground/72">{testimonial.quote}</p>
                          <div className="mt-8 flex items-center gap-4">
                            <Avatar className="h-14 w-14 border border-border bg-primary/10">
                              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                                {testimonial.name.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground">{testimonial.name}</div>
                              <div className="text-sm text-foreground/45">{testimonial.role}</div>
                              <div className="mt-2 text-sm tracking-[0.4em] text-primary">★★★★★</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="border-border bg-card text-foreground hover:bg-card" />
                <CarouselNext className="border-border bg-card text-foreground hover:bg-card" />
              </Carousel>
            </Reveal>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center overflow-hidden border-t border-border px-4 py-24 md:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_28%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <Reveal>
              <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-foreground md:text-7xl xl:text-[5.4rem]">
                ابدأ رحلتك
                <br />
                كمدرب محترف
              </h2>
              <p className="mx-auto mt-8 max-w-2xl text-xl leading-9 text-foreground/60">
                مجاني 6 شهور. بدون بطاقة ائتمان. ومن أول يوم ستشعر أن التشغيل أصبح جزءاً من علامتك لا عبئاً عليها.
              </p>
              <Button asChild className="mt-10 h-16 rounded-full px-10 text-xl font-black shadow-[0_24px_80px_hsl(var(--primary)/0.32)]">
                <Link to="/register" className="inline-flex items-center gap-2">
                  سجّل الآن مجاناً
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 px-4 py-10 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-primary">fitni</div>
                <div className="text-sm text-foreground/45">منصة المدرب الشخصي</div>
              </div>
            </div>
            <p className="mt-4 max-w-md text-base leading-8 text-foreground/60">
              منصة عربية premium تساعد المدربين الشخصيين على إدارة العمل، تجربة العميل، والمدفوعات في مكان واحد.
            </p>
          </div>

          <div>
            <div className="mb-4 text-sm font-bold text-foreground">روابط</div>
            <div className="space-y-3 text-foreground/60">
              <a href="#features" className="block transition-colors hover:text-foreground">المميزات</a>
              <a href="#pricing" className="block transition-colors hover:text-foreground">التسعير</a>
              <Link to="/login" className="block transition-colors hover:text-foreground">تسجيل الدخول</Link>
            </div>
          </div>

          <div>
            <div className="mb-4 text-sm font-bold text-foreground">قانوني وتواصل</div>
            <div className="space-y-3 text-foreground/60">
              <a href="#" className="block transition-colors hover:text-foreground">سياسة الخصوصية</a>
              <a href="#" className="block transition-colors hover:text-foreground">الشروط</a>
              <div className="flex items-center gap-3 pt-2 text-foreground/55">
                <a href="#" aria-label="Instagram" className="rounded-full border border-border p-2 transition-colors hover:text-primary">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Twitter" className="rounded-full border border-border p-2 transition-colors hover:text-primary">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" aria-label="LinkedIn" className="rounded-full border border-border p-2 transition-colors hover:text-primary">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-border pt-6 text-sm text-foreground/40 md:flex-row md:items-center md:justify-between">
          <div>© 2026 fitni. جميع الحقوق محفوظة.</div>
          <div>صُنع في السعودية</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
