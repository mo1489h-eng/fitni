import { useQuery } from "@tanstack/react-query";
import { usePortalToken } from "@/hooks/usePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingDown, Dumbbell, Calendar, Flame, Award } from "lucide-react";

const ACHIEVEMENT_CONFIG: Record<string, { icon: any; color: string }> = {
  weight_loss: { icon: TrendingDown, color: "text-green-500" },
  muscle_gain: { icon: Dumbbell, color: "text-blue-500" },
  streak: { icon: Flame, color: "text-orange-500" },
  program_complete: { icon: Trophy, color: "text-yellow-500" },
  consistency: { icon: Calendar, color: "text-purple-500" },
};

const PortalAchievements = () => {
  const { token } = usePortalToken();

  const { data: achievements = [] } = useQuery({
    queryKey: ["portal-achievements", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_achievements" as any, { p_token: token! });
      if (error) return [];
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return Array.isArray(parsed) ? parsed : [];
    },
    enabled: !!token,
  });

  if (achievements.length === 0) return null;

  return (
    <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <h3 className="font-bold text-white text-sm">انجازاتي</h3>
        <span className="text-[10px] text-[hsl(0_0%_35%)] mr-auto bg-[hsl(0_0%_10%)] px-2 py-0.5 rounded-full">
          {achievements.length}
        </span>
      </div>
      <div className="space-y-2">
        {achievements.map((a: any) => {
          const config = ACHIEVEMENT_CONFIG[a.achievement_type] || { icon: Trophy, color: "text-primary" };
          const Icon = config.icon;
          return (
            <div key={a.id} className="flex items-center gap-3 bg-[hsl(0_0%_4%)] rounded-lg p-3 border-r-2 border-r-primary">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${config.color}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{a.achievement_value}</p>
                {a.achievement_detail && (
                  <p className="text-[10px] text-[hsl(0_0%_40%)]">{a.achievement_detail}</p>
                )}
              </div>
              <div className="text-left shrink-0">
                <p className="text-[10px] text-[hsl(0_0%_30%)]">
                  {new Date(a.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                </p>
                {a.is_visible_on_page && a.is_approved && (
                  <span className="text-[9px] text-primary">معروض</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortalAchievements;
