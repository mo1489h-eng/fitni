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
    title: "أهلاً بك في fitni",
    description: "جولة سريعة تعرّفك على كل شيء — خلّنا نبدأ",
    icon: Dumbbell,
    route: "/dashboard",
  },
...
  {
    id: "done",
    title: "أنت جاهز للبدء",
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