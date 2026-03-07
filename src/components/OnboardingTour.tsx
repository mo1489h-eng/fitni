import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, X, ArrowLeft, Users, ClipboardList, Link2, CreditCard, Rocket } from "lucide-react";

const ONBOARDING_KEY = "fitni_onboarding_done";

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  highlightSelector?: string;
}

const steps: Step[] = [
  {
    title: "أهلاً بك في fitni! 🎉",
    description: "دعنا نريك كيف تستخدم المنصة — جولة سريعة (2 دقيقة)",
    icon: Dumbbell,
  },
  {
    title: "لوحة التحكم",
    description: "هنا تشوف إحصائياتك اليومية — عدد العملاء، الإيرادات، والنشاط",
    icon: Dumbbell,
    route: "/dashboard",
  },
  {
    title: "إضافة أول عميل",
    description: "ابدأ بإضافة أول عميل لك — أدخل اسمه، جواله، وهدفه",
    icon: Users,
    route: "/clients",
  },
  {
    title: "بناء البرامج التدريبية",
    description: "هنا تبني برامج التدريب — استخدم القوالب الجاهزة أو ابنِ من الصفر",
    icon: ClipboardList,
    route: "/programs",
  },
  {
    title: "بوابة العميل",
    description: "كل عميل عنده رابط خاص — يفتحه ويشوف برنامجه وتمارينه ويسجل تقدمه",
    icon: Link2,
  },
  {
    title: "المدفوعات والاشتراكات",
    description: "تابع مدفوعات عملاءك وأرسل تذكيرات بضغطة واحدة",
    icon: CreditCard,
    route: "/payments",
  },
  {
    title: "أنت جاهز! 🚀",
    description: "ابدأ بإضافة أول عميل الآن وانطلق",
    icon: Rocket,
  },
];

const OnboardingTour = () => {
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done && location.pathname === "/dashboard") {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const close = useCallback(() => {
    setActive(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  const next = useCallback(() => {
    if (current >= steps.length - 1) {
      close();
      navigate("/clients");
      return;
    }
    const nextStep = steps[current + 1];
    if (nextStep.route && location.pathname !== nextStep.route) {
      navigate(nextStep.route);
    }
    setCurrent((c) => c + 1);
  }, [current, close, navigate, location.pathname]);

  const prev = useCallback(() => {
    if (current <= 0) return;
    const prevStep = steps[current - 1];
    if (prevStep.route && location.pathname !== prevStep.route) {
      navigate(prevStep.route);
    }
    setCurrent((c) => c - 1);
  }, [current, navigate, location.pathname]);

  if (!active) return null;

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Card */}
      <div className="relative z-10 bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl animate-scale-in">
        {/* Skip */}
        <button onClick={close} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <StepIcon className="w-7 h-7 text-primary" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-foreground text-center mb-2">{step.title}</h2>
        <p className="text-muted-foreground text-center text-sm leading-relaxed mb-6">{step.description}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? "bg-primary w-5" : i < current ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isFirst ? (
            <>
              <Button variant="outline" className="flex-1" onClick={close}>
                تخطي
              </Button>
              <Button className="flex-[2] gap-1" onClick={next}>
                ابدأ الجولة
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </>
          ) : isLast ? (
            <>
              <Button variant="outline" className="flex-1" onClick={close}>
                استكشف بنفسي
              </Button>
              <Button className="flex-[2] gap-1" onClick={() => { close(); navigate("/clients"); }}>
                إضافة أول عميل
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" onClick={prev}>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Button>
              <Button className="flex-1 gap-1" onClick={next}>
                التالي
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
