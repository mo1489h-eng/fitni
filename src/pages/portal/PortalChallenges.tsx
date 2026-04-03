import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortalToken } from "@/hooks/usePortalToken";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import {
  Trophy, Flame, Dumbbell, Activity, TrendingUp, Timer, Loader2,
  Medal, Crown, Calendar, Gift, ChevronLeft, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const CHALLENGE_ICONS: Record<string, any> = {
  weight_loss: { icon: Flame, color: "text-orange-400" },
  consistency: { icon: Activity, color: "text-blue-400" },
  exercises: { icon: Dumbbell, color: "text-purple-400" },
  strength: { icon: TrendingUp, color: "text-red-400" },
  duration: { icon: Timer, color: "text-cyan-400" },
};

const PortalChallenges = () => {
  const { token } = usePortalToken();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["portal-challenges", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_challenges" as any, { p_token: token! });
      if (error) return [];
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return (parsed || []) as any[];
    },
    enabled: !!token,
  });

  const selected = challenges.find((c: any) => c.challenge_id === selectedId);

  const statusText = (s: string) =>
    s === "active" ? "نشط" : s === "upcoming" ? "قادم" : "منتهي";

  const statusVariant = (s: string) =>
    s === "active" ? "default" : s === "upcoming" ? "secondary" : "outline";

  const getIcon = (type: string) => CHALLENGE_ICONS[type] || CHALLENGE_ICONS.consistency;

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  // Detail view
  if (selected) {
    const iconInfo = getIcon(selected.challenge_type);
    const TypeIcon = iconInfo.icon;
    const leaderboard = selected.leaderboard || [];

    return (
      <ClientPortalLayout>
        <div className="space-y-4 animate-fade-in">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-sm text-[hsl(0_0%_45%)] hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            العودة
          </button>

          {/* Challenge Header */}
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-t-2 border-t-primary p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[hsl(0_0%_10%)] flex items-center justify-center">
                  <TypeIcon className={`w-4.5 h-4.5 ${iconInfo.color}`} strokeWidth={1.5} />
                </div>
                <h1 className="text-lg font-bold text-white">{selected.title}</h1>
              </div>
              <Badge variant={statusVariant(selected.status) as any}>
                {statusText(selected.status)}
              </Badge>
            </div>
            {selected.description && (
              <p className="text-sm text-[hsl(0_0%_45%)]">{selected.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-[hsl(0_0%_40%)] flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                {selected.start_date} - {selected.end_date}
              </span>
              {selected.prize_description && (
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  {selected.prize_description}
                </span>
              )}
            </div>
          </div>

          {/* My Progress Card */}
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-primary/20 p-4">
            <p className="text-xs text-[hsl(0_0%_40%)] mb-2">نتيجتي الحالية</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tabular-nums">
                {selected.my_current_value || 0}
              </span>
              <span className="text-sm text-[hsl(0_0%_45%)]">{selected.kpi_unit}</span>
            </div>
            {selected.my_rank && (
              <p className="text-xs text-primary mt-1">
                المركز #{selected.my_rank}
              </p>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Medal className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-white text-sm">
                المتصدرين ({leaderboard.length})
              </h3>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-[hsl(0_0%_35%)] text-center py-6">
                لا يوجد مشاركين بعد
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((p: any, i: number) => {
                  const isWinner =
                    i === 0 && selected.status === "completed";
                  return (
                    <div
                      key={p.participant_id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        p.is_me
                          ? "bg-primary/5 border-primary/30"
                          : "bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold text-lg tabular-nums w-8 text-center ${
                            i === 0
                              ? "text-amber-400"
                              : i === 1
                              ? "text-[hsl(0_0%_60%)]"
                              : i === 2
                              ? "text-amber-700"
                              : "text-[hsl(0_0%_35%)]"
                          }`}
                        >
                          {isWinner ? (
                            <Crown className="w-5 h-5 text-amber-400 mx-auto" strokeWidth={1.5} />
                          ) : (
                            `#${i + 1}`
                          )}
                        </span>
                        <div>
                          <span className={`font-medium text-sm ${p.is_me ? "text-primary" : "text-white"}`}>
                            {p.is_me ? "أنت" : (p.client_name?.split(" ")[0] || "---")}
                          </span>
                          {p.badges?.includes("winner") && (
                            <Badge className="mr-2 bg-amber-400/10 text-amber-400 border-amber-400/30 text-[10px]">
                              الفائز
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-white tabular-nums">
                        {p.current_value} {selected.kpi_unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  // List view
  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-white">تحدياتي</h1>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Trophy className="w-12 h-12 text-[hsl(0_0%_20%)] mx-auto" strokeWidth={1.5} />
            <p className="text-[hsl(0_0%_40%)]">لا توجد تحديات حالياً</p>
            <p className="text-xs text-[hsl(0_0%_30%)]">
              عندما يضيفك مدربك لتحدي سيظهر هنا
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c: any) => {
              const iconInfo = getIcon(c.challenge_type);
              const TypeIcon = iconInfo.icon;
              const lb = c.leaderboard || [];
              const myPos = lb.findIndex((p: any) => p.is_me) + 1;
              return (
                <button
                  key={c.challenge_id}
                  onClick={() => setSelectedId(c.challenge_id)}
                  className="w-full text-right bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 space-y-2 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(0_0%_10%)] flex items-center justify-center">
                        <TypeIcon className={`w-4 h-4 ${iconInfo.color}`} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-bold text-white text-sm">{c.title}</h3>
                    </div>
                    <Badge variant={statusVariant(c.status) as any} className="text-[10px]">
                      {statusText(c.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[hsl(0_0%_40%)]">
                    <span>نتيجتك: {c.my_current_value || 0} {c.kpi_unit}</span>
                    {myPos > 0 && <span>المركز #{myPos} من {lb.length}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[hsl(0_0%_30%)]">
                      {c.start_date} - {c.end_date}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-[hsl(0_0%_30%)]" strokeWidth={1.5} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalChallenges;
