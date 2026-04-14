import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTrialEndDate } from "@/lib/trial-config";

export type PlanType = "free" | "basic" | "pro" | null;

const PLAN_LIMITS: Record<string, { maxClients: number }> = {
  free: { maxClients: 0 },
  basic: { maxClients: 20 },
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

  const rawPlan = profile?.subscription_plan;
  const plan: PlanType = rawPlan === "basic" || rawPlan === "pro" ? rawPlan : "free";

  const trialEndDate = getTrialEndDate(profile?.created_at);

  const now = new Date();
  const msRemaining = trialEndDate.getTime() - now.getTime();
  const trialDaysLeft = Math.max(Math.ceil(msRemaining / (1000 * 60 * 60 * 24)), 0);
  const isOnTrial = plan === "free" && msRemaining > 0;
  const isTrialExpired = plan === "free" && !isOnTrial;

  const isFree = plan === "free";
  const isBasic = plan === "basic";
  const isPro = plan === "pro";
  const hasFullAccess = isPro || isBasic || isOnTrial;

  const maxClients = isOnTrial ? Infinity : (PLAN_LIMITS[plan]?.maxClients ?? 0);
  const canAddClient = clientCount < maxClients && !isTrialExpired;

  const hasReportsAccess = hasFullAccess;
  const hasCopilotAccess = hasFullAccess;
  const hasChallengesAccess = hasFullAccess;
  const hasMarketplaceAccess = hasFullAccess;
  const hasDiscoveryAccess = hasFullAccess;

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

    if (clientCount >= maxClients && isBasic) {
      return {
        blocked: true,
        title: "وصلت الحد الأقصى للباقة الأساسية",
        description: "ترقّ للاحترافي لإضافة عملاء غير محدودين",
      };
    }

    return null;
  };

  const getProFeatureBlockReason = () => ({
    blocked: !hasFullAccess,
    title: "هذه الميزة غير متاحة حالياً",
    description: "فعّل باقتك للاستمرار في استخدام هذه الميزة بعد انتهاء الفترة المجانية.",
  });

  const isFounder = profile?.is_founder === true;
  const founderDiscountUsed = profile?.founder_discount_used === true;
  const founderDiscountAvailable = isFounder && !founderDiscountUsed;

  return {
    plan,
    clientCount,
    maxClients,
    canAddClient,
    hasFullAccess,
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
    isFounder,
    founderDiscountUsed,
    founderDiscountAvailable,
    getAddClientBlockReason,
    getProFeatureBlockReason,
  };
}
