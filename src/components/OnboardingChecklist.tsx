import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, UserPlus, ClipboardList, Globe, CreditCard, Share2,
  ChevronDown, ChevronUp, Rocket, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
}

const OnboardingChecklist = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // Load collapsed pref from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("onboarding-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("onboarding-collapsed", String(next));
  };

  // Fetch completion data
  const { data: completedSteps = [] } = useQuery({
    queryKey: ["onboarding-steps", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_steps_completed")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as any)?.onboarding_steps_completed || [];
    },
    enabled: !!user,
  });

  // Auto-detect completion
  const { data: counts } = useQuery({
    queryKey: ["onboarding-counts", user?.id],
    queryFn: async () => {
      const [clients, programs, packages, profileData] = await Promise.all([
        supabase.from("clients").select("id", { head: true, count: "exact" }),
        supabase.from("programs").select("id", { head: true, count: "exact" }),
        supabase.from("trainer_packages").select("id", { head: true, count: "exact" }),
        supabase.from("profiles").select("full_name, avatar_url, bio, specialization").eq("user_id", user!.id).maybeSingle(),
      ]);
      return {
        clients: clients.count ?? 0,
        programs: programs.count ?? 0,
        packages: packages.count ?? 0,
        profileComplete: !!(profileData.data?.full_name && profileData.data?.avatar_url),
        pageCustomized: !!(profileData.data?.bio && profileData.data?.avatar_url),
      };
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const markStep = useCallback(async (stepId: string) => {
    if (!user || completedSteps.includes(stepId)) return;
    const updated = [...completedSteps, stepId];
    await supabase
      .from("profiles")
      .update({ onboarding_steps_completed: updated } as any)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["onboarding-steps", user.id] });
    setJustCompleted(stepId);
    setTimeout(() => setJustCompleted(null), 1500);
  }, [user, completedSteps, queryClient]);

  // Auto-detect and mark steps
  useEffect(() => {
    if (!counts || !user) return;
    if (counts.profileComplete && !completedSteps.includes("profile")) markStep("profile");
    if (counts.clients > 0 && !completedSteps.includes("client")) markStep("client");
    if (counts.programs > 0 && !completedSteps.includes("program")) markStep("program");
    if (counts.pageCustomized && !completedSteps.includes("page")) markStep("page");
    if (counts.packages > 0 && !completedSteps.includes("package")) markStep("package");
  }, [counts, completedSteps, markStep, user]);

  const handleCopyLink = async () => {
    const username = profile?.username;
    if (!username) {
      toast.error("أضف اسم مستخدم أولاً من الإعدادات");
      navigate("/settings");
      return;
    }
    await navigator.clipboard.writeText(`https://fitni.lovable.app/t/${username}`);
    toast.success("تم نسخ الرابط");
    markStep("link");
  };

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      icon: CheckCircle,
      title: "أكمل ملفك الشخصي",
      description: "أضف صورتك ومعلوماتك",
      actionLabel: "أكمل الملف",
      action: () => navigate("/settings"),
    },
    {
      id: "client",
      icon: UserPlus,
      title: "أضف أول عميل",
      description: "ابدأ بإضافة عميلك الأول",
      actionLabel: "إضافة عميل",
      action: () => navigate("/clients"),
    },
    {
      id: "program",
      icon: ClipboardList,
      title: "أنشئ برنامج تدريب",
      description: "ابنِ برنامجك الأول أو استخدم قالبا",
      actionLabel: "إنشاء برنامج",
      action: () => navigate("/programs"),
    },
    {
      id: "page",
      icon: Globe,
      title: "خصّص صفحتك العامة",
      description: "أضف صورتك وباقاتك لجذب عملاء جدد",
      actionLabel: "تخصيص الصفحة",
      action: () => navigate("/settings/page"),
    },
    {
      id: "package",
      icon: CreditCard,
      title: "أنشئ أول باقة",
      description: "حدد أسعارك وابدأ استقبال المدفوعات",
      actionLabel: "إنشاء باقة",
      action: () => navigate("/packages"),
    },
    {
      id: "link",
      icon: Share2,
      title: "شارك رابطك",
      description: "انشر رابط صفحتك على سوشيال ميديا",
      actionLabel: "نسخ الرابط",
      action: handleCopyLink,
    },
  ];

  const completedCount = steps.filter((s) => completedSteps.includes(s.id)).length;
  const allDone = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  // Check if dismissed
  useEffect(() => {
    if (localStorage.getItem("onboarding-dismissed") === "true") setDismissed(true);
  }, []);

  const handleDismiss = async () => {
    setDismissed(true);
    localStorage.setItem("onboarding-dismissed", "true");
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    }
  };

  if (dismissed) return null;

  // Collapsed state
  if (collapsed) {
    return (
      <Card
        className="border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary/30"
        onClick={toggleCollapsed}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors duration-300",
                    completedSteps.includes(s.id) ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {allDone ? "الإعداد مكتمل" : "متابعة الإعداد"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </CardContent>
      </Card>
    );
  }

  // All done state
  if (allDone) {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">أنت جاهز تماما</h3>
            <p className="mt-1 text-sm text-muted-foreground">المنصة مكتملة وجاهزة لعملاءك</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            إخفاء هذه البطاقة
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">ابدأ رحلتك مع fitni</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} من {steps.length} مكتمل ({Math.round(progress)}%)
              </p>
            </div>
          </div>
          <button
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border px-5 pb-2 pt-3">
          {steps.map((step) => {
            const done = completedSteps.includes(step.id);
            const justDone = justCompleted === step.id;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-4 py-4 transition-all duration-300",
                  justDone && "animate-pulse"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                    done ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  {done ? (
                    <CheckCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  ) : (
                    <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium transition-all duration-300",
                      done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {!done && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={step.action}
                  >
                    {step.actionLabel}
                    <span className="text-[10px]">&larr;</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
