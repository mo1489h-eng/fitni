import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Hexagon, UserCheck, Zap, Leaf, DollarSign, Package, Trophy,
  UtensilsCrossed, FileText, Settings, Dumbbell, Rocket, CalendarDays,
  Store, Globe, PlusCircle, BarChart3, Bell, Search,
} from "lucide-react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  spotlightSelector?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // ━━━ WELCOME ━━━
  {
    id: "welcome",
    title: "أهلاً بك في fitni! 🎉",
    description: "جولة سريعة تعرّفك على كل شيء — خلّنا نبدأ",
    icon: Dumbbell,
    route: "/dashboard",
  },

  // ━━━ DASHBOARD ━━━
  {
    id: "dashboard-stats",
    title: "لوحة الإحصائيات 📊",
    description: "هنا تشوف عدد عملاءك، إيراداتك، ومعدل النشاط في نظرة واحدة",
    icon: Hexagon,
    route: "/dashboard",
    spotlightSelector: "[data-tour='stats']",
  },
  {
    id: "dashboard-alerts",
    title: "التنبيهات الذكية ⚡",
    description: "النظام ينبهك تلقائياً عن العملاء غير النشطين والاشتراكات القريبة من الانتهاء",
    icon: Bell,
    route: "/dashboard",
  },

  // ━━━ CLIENTS ━━━
  {
    id: "clients-page",
    title: "إدارة العملاء 👥",
    description: "أضف عملاءك، تابع تقدمهم، وتواصل معهم بضغطة واحدة",
    icon: UserCheck,
    route: "/clients",
  },
  {
    id: "clients-add",
    title: "إضافة عميل جديد ➕",
    description: "اضغط هنا لإضافة عميل جديد — أدخل اسمه ورقمه وهدفه وخلاص",
    icon: PlusCircle,
    route: "/clients",
    spotlightSelector: "[data-tour='add-client']",
  },
  {
    id: "clients-search",
    title: "البحث والفلترة 🔍",
    description: "ابحث عن أي عميل بالاسم أو فلتر حسب الحالة",
    icon: Search,
    route: "/clients",
    spotlightSelector: "[data-tour='search']",
  },

  // ━━━ PROGRAMS ━━━
  {
    id: "programs-page",
    title: "البرامج التدريبية ⚡",
    description: "ابنِ برامج تدريبية احترافية — أيام، تمارين، تكرارات، وفيديوهات",
    icon: Zap,
    route: "/programs",
  },
  {
    id: "programs-templates",
    title: "قوالب جاهزة 📋",
    description: "ابدأ بقالب جاهز أو ابنِ برنامجك من الصفر وخصصه لكل عميل",
    icon: Zap,
    route: "/programs",
    spotlightSelector: "[data-tour='program-templates']",
  },

  // ━━━ NUTRITION ━━━
  {
    id: "nutrition-page",
    title: "خطط التغذية 🥗",
    description: "صمّم جداول غذائية مخصصة لكل عميل مع حساب السعرات والماكروز",
    icon: Leaf,
    route: "/nutrition",
  },
  {
    id: "nutrition-create",
    title: "إنشاء خطة تغذية",
    description: "اضغط هنا لإنشاء خطة جديدة — أضف وجبات ومكونات لكل يوم",
    icon: Leaf,
    route: "/nutrition",
    spotlightSelector: "[data-tour='create-plan']",
  },

  // ━━━ PAYMENTS ━━━
  {
    id: "payments-page",
    title: "المدفوعات والإيرادات 💰",
    description: "تابع كل المدفوعات — من دفع، من تأخر، وإجمالي إيراداتك",
    icon: DollarSign,
    route: "/payments",
  },

  // ━━━ PACKAGES ━━━
  {
    id: "packages-page",
    title: "باقاتي 📦",
    description: "أنشئ باقات بأسعار مختلفة وشاركها مع عملاءك المحتملين عبر رابط مباشر",
    icon: Package,
    route: "/packages",
  },

  // ━━━ CHALLENGES ━━━
  {
    id: "challenges-page",
    title: "التحديات 🏆",
    description: "أنشئ تحديات لعملاءك — خسارة وزن، خطوات، وأكثر — مع ترتيب ومتابعة",
    icon: Trophy,
    route: "/challenges",
  },

  // ━━━ GULF FOODS ━━━
  {
    id: "gulf-foods",
    title: "الأطعمة الخليجية 🍽️",
    description: "قاعدة بيانات شاملة للأطعمة الخليجية مع السعرات والقيم الغذائية",
    icon: UtensilsCrossed,
    route: "/gulf-foods",
  },

  // ━━━ MARKETPLACE ━━━
  {
    id: "marketplace",
    title: "سوق البرامج 🏪",
    description: "بيع برامجك أو اشترِ برامج من مدربين آخرين",
    icon: Store,
    route: "/marketplace",
  },

  // ━━━ REPORTS ━━━
  {
    id: "reports-page",
    title: "التقارير 📈",
    description: "تقارير مفصلة عن أداء عملاءك وإيراداتك وإحصائياتك",
    icon: BarChart3,
    route: "/reports",
  },

  // ━━━ SETTINGS ━━━
  {
    id: "settings-page",
    title: "الإعدادات ⚙️",
    description: "خصص ملفك، اسم المستخدم، صفحتك الشخصية، وبيانات الدفع",
    icon: Settings,
    route: "/settings",
  },
  {
    id: "settings-public-page",
    title: "صفحتك الشخصية العامة 🌐",
    description: "أنشئ صفحة احترافية وشارك رابطها في السوشيال — أي شخص يضغطه يشوف خدماتك وباقاتك",
    icon: Globe,
    route: "/settings",
  },

  // ━━━ DONE ━━━
  {
    id: "done",
    title: "أنت جاهز تبدأ! 🚀",
    description: "ابدأ الحين بإضافة أول عميل — بالتوفيق!",
    icon: Rocket,
    route: "/dashboard",
  },
];

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TutorialStep | null;
  startTutorial: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  step: null,
  startTutorial: () => {},
  next: () => {},
  prev: () => {},
  skip: () => {},
});

export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();

  const markComplete = useCallback(async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    }
  }, [user]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    markComplete();
  }, [markComplete]);

  const next = useCallback(() => {
    if (currentStep >= TUTORIAL_STEPS.length - 1) {
      setIsActive(false);
      markComplete();
    } else {
      setCurrentStep((c) => c + 1);
    }
  }, [currentStep, markComplete]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((c) => c - 1);
  }, [currentStep]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TUTORIAL_STEPS.length,
        step: isActive ? TUTORIAL_STEPS[currentStep] : null,
        startTutorial,
        next,
        prev,
        skip,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export { TUTORIAL_STEPS };