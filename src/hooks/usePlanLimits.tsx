import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "free" | "basic" | "pro" | null;

const FREE_YEAR_DAYS = 365;

const PLAN_LIMITS: Record<string, { maxClients: number }> = {
  free: { maxClients: Infinity },
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
  const freeYearDaysLeft = Math.max(FREE_YEAR_DAYS - daysSinceCreation, 0);
  const freeYearEndDate = new Date(createdAt.getTime() + FREE_YEAR_DAYS * 24 * 60 * 60 * 1000);
  const isTrialExpired = plan === "free" && freeYearDaysLeft <= 0;
  const isOnTrial = plan === "free" && freeYearDaysLeft > 0;

  const maxClients = PLAN_LIMITS[plan]?.maxClients ?? 3;
  const canAddClient = clientCount < maxClients && !isTrialExpired;

  const hasReportsAccess = plan === "pro";

  const getAddClientBlockReason = (): {
    blocked: boolean;
    title: string;
    description: string;
  } | null => {
    if (isTrialExpired) {
      return {
        blocked: true,
        title: "انتهت السنة المجانية",
        description: "اشترك للاستمرار في إضافة عملاء وإدارة برامجك",
      };
    }
    if (clientCount >= maxClients) {
      if (plan === "basic") {
        return {
          blocked: true,
          title: "وصلت للحد الأقصى للباقة الأساسية",
          description: "قم بالترقية للباقة الاحترافية لإضافة عملاء أكثر",
        };
      }
    }
    return null;
  };

  return {
    plan,
    clientCount,
    maxClients,
    canAddClient,
    hasReportsAccess,
    isTrialExpired,
    isOnTrial,
    freeYearDaysLeft,
    freeYearEndDate,
    getAddClientBlockReason,
  };
}
