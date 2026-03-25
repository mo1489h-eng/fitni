import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Gift, Save, Loader2, CheckCircle, Clock, Award } from "lucide-react";

const REWARD_TYPES = [
  { value: "free_month", label: "شهر مجاني" },
  { value: "discount", label: "خصم على الاشتراك" },
  { value: "custom", label: "مكافأة مخصصة" },
];

const ReferralSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rewardType, setRewardType] = useState("free_month");
  const [rewardText, setRewardText] = useState("");

  // Fetch current settings
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_enabled, referral_reward_type, referral_reward_text")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled((data as any).referral_enabled ?? false);
        setRewardType((data as any).referral_reward_type || "free_month");
        setRewardText((data as any).referral_reward_text || "");
      }
    };
    fetch();
  }, [user]);

  // Fetch referrals
  const { data: referrals = [] } = useQuery({
    queryKey: ["trainer-referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*, referrer:referrer_client_id(name), referred:referred_client_id(name)")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          referral_enabled: enabled,
          referral_reward_type: rewardType,
          referral_reward_text: rewardText,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "تم حفظ إعدادات الإحالة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRewardStatus = async (id: string, status: string) => {
    await supabase.from("referrals").update({ reward_status: status } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trainer-referrals"] });
    toast({ title: status === "rewarded" ? "تم تسليم المكافأة" : "تم التحديث" });
  };

  const rewardLabel = REWARD_TYPES.find(r => r.value === rewardType)?.label || rewardType;
  const pendingCount = referrals.filter((r: any) => r.reward_status === "pending").length;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-card-foreground">نظام الإحالات</h2>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-card-foreground">تفعيل نظام الإحالة</p>
          <p className="text-xs text-muted-foreground">يحصل كل عميل على رابط إحالة فريد</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-semibold text-card-foreground">نوع المكافأة</p>
            <Select value={rewardType} onValueChange={setRewardType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {rewardType === "custom" && (
              <Input
                value={rewardText}
                onChange={e => setRewardText(e.target.value)}
                placeholder="وصف المكافأة (مثل: جلسة مجانية)"
                className="mt-2"
              />
            )}
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ إعدادات الإحالة
          </Button>

          {/* Referral stats */}
          {referrals.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-card-foreground">
                  سجل الإحالات ({referrals.length})
                  {pendingCount > 0 && (
                    <span className="text-xs text-yellow-500 mr-2">{pendingCount} بانتظار المكافأة</span>
                  )}
                </p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between bg-[hsl(0_0%_6%)] rounded-lg p-3 border border-[hsl(0_0%_10%)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-card-foreground truncate">
                        <span className="text-primary font-medium">{ref.referrer?.name}</span>
                        {" ← "}
                        <span className="text-muted-foreground">{ref.referred?.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    {ref.reward_status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs shrink-0 border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/10"
                        onClick={() => handleRewardStatus(ref.id, "rewarded")}
                      >
                        <Award className="w-3 h-3" />
                        تسليم المكافأة
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        تم التسليم
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default ReferralSettings;
