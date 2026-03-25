import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalToken } from "@/hooks/usePortalToken";
import { Button } from "@/components/ui/button";
import { Users, Copy, CheckCircle, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PortalReferral = () => {
  const { token } = usePortalToken();
  const [copied, setCopied] = useState(false);

  // Get client info
  const { data: client } = useQuery({
    queryKey: ["portal-client-ref", token],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  // Check if trainer has referral enabled
  const { data: trainerProfile, isLoading } = useQuery({
    queryKey: ["portal-trainer-referral", client?.trainer_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_enabled, referral_reward_type, referral_reward_text, username")
        .eq("user_id", client!.trainer_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.trainer_id,
  });

  // Get client's referral code
  const { data: clientData } = useQuery({
    queryKey: ["portal-client-refcode", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("referral_code")
        .eq("id", client!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!client?.id,
  });

  // Get referral count
  const { data: referralCount = 0 } = useQuery({
    queryKey: ["portal-referral-count", client?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_client_id", client!.id);
      return count || 0;
    },
    enabled: !!client?.id,
  });

  if (isLoading) return null;
  if (!(trainerProfile as any)?.referral_enabled) return null;

  const referralCode = (clientData as any)?.referral_code;
  const referralLink = referralCode ? `https://coachbase.health/ref/${referralCode}` : "";

  const rewardLabel = (trainerProfile as any)?.referral_reward_type === "free_month"
    ? "شهر مجاني"
    : (trainerProfile as any)?.referral_reward_type === "discount"
    ? "خصم على الاشتراك"
    : (trainerProfile as any)?.referral_reward_text || "مكافأة";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("تم نسخ رابط الإحالة");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-bold text-white text-sm">احضر صديق</p>
          <p className="text-xs text-[hsl(0_0%_40%)]">واحصل على {rewardLabel}</p>
        </div>
      </div>

      {/* Referral link */}
      {referralLink && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-[hsl(0_0%_4%)] border border-[hsl(0_0%_12%)] rounded-lg px-3 py-2 text-xs text-[hsl(0_0%_50%)] truncate" dir="ltr">
            {referralLink}
          </div>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            className="gap-1 shrink-0"
            onClick={handleCopy}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "تم" : "نسخ"}
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[hsl(0_0%_4%)] rounded-lg px-3 py-2 flex-1">
          <Gift className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-[hsl(0_0%_40%)]">أصدقاء انضموا</p>
            <p className="text-sm font-bold text-white">{referralCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalReferral;
