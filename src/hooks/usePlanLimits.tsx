import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "free" | "basic" | "pro" | null;

const FREE_TRIAL_DAYS = 183; // 6 months

const PLAN_LIMITS: Record<string, { maxClients: number }> = {
  free: { maxClients: Infinity }, // During trial: unlimited
  basic: { maxClients: 10 },
  pro: { maxClients: Infinity },
};

export function usePlanLimits() {
  const { profile, user } = useAuth();

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["client-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const plan: PlanType = (profile?.subscription_plan as PlanType) || "free";

  const createdAt = profile ? new Date(profile.created_at) : new Date();
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const trialDaysLeft = Math.max(FREE_TRIAL_DAYS - daysSinceCreation, 0);
  const trialEndDate = new Date(createdAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const isTrialExpired = plan === "free" && trialDaysLeft <= 0;
  const isOnTrial = plan === "free" && trialDaysLeft > 0;

  const maxClients = PLAN_LIMITS[plan]?.maxClients ?? 10;
  const canAddClient = clientCount < maxClients && !isTrialExpired;

  const isFree = plan === "free";
  const isBasic = plan === "basic";
  const isPro = plan === "pro";

  const hasReportsAccess = isPro;
  const hasCopilotAccess = isPro;
  const hasChallengesAccess = isPro;
  const hasMarketplaceAccess = isPro;
  const hasDiscoveryAccess = isPro;

  const getAddClientBlockReason = (): {
    blocked: boolean;
    title: string;
    description: string;
  } | null => {
    if (isTrialExpired) {
      return {
        blocked: true,
        title: "انتهت الفترة المجانية",
        description: "اشترك للاستمرار في إضافة العملاء وإدارة برامجك.",
      };
    }
    if (clientCount >= maxClients && (isBasic || isFree)) {
      return {
        blocked: true,
        title: "وصلت الحد الأقصى للباقة الأساسية",
        description: "ترقّ للاحترافي لإضافة عملاء غير محدودين",
      };
    }
    return null;
  };

  const getProFeatureBlockReason = () => ({
    blocked: !isPro,
    title: "هذه الميزة للباقة الاحترافية",
    description: "احصل على عملاء غير محدودين + AI كوبايلت + التحديات الجماعية",
  });

  return {
    plan,
    clientCount,
    maxClients,
    canAddClient,
    hasReportsAccess,
    hasCopilotAccess,
    hasChallengesAccess,
    hasMarketplaceAccess,
    hasDiscoveryAccess,
    isTrialExpired,
    isOnTrial,
    trialDaysLeft,
    trialEndDate,
    isFree,
    isBasic,
    isPro,
    getAddClientBlockReason,
    getProFeatureBlockReason,
  };
}
