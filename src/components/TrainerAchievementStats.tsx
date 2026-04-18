import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  border: "#1e1e1e",
  green: "#3d5940",
  text: "#ededed",
  muted: "#888888",
};

const TrainerAchievementStats = ({ trainerId, brandColor }: { trainerId: string; brandColor: string }) => {
  const { data: stats } = useQuery({
    queryKey: ["public-trainer-stats", trainerId],
    queryFn: async () => {
      // Fetch real data for stats
      const [clientsRes, achievementsRes, workoutLogsRes, profileRes] = await Promise.all([
        supabase.from("clients").select("id, goal, weight, created_at", { count: "exact" }).eq("trainer_id", trainerId),
        supabase.from("client_achievements").select("id, achievement_type, achievement_value").eq("trainer_id", trainerId).eq("is_approved", true),
        supabase.from("workout_logs").select("id, completed").eq("completed", true).limit(1000),
        supabase.from("profiles").select("created_at").eq("user_id", trainerId).maybeSingle(),
      ]);

      const totalClients = clientsRes.count || 0;
      const goalsAchieved = (achievementsRes.data || []).filter(a => 
        a.achievement_type === "program_complete" || a.achievement_type === "weight_loss"
      ).length;

      // Calculate years of experience from profile creation
      const profileCreated = profileRes.data?.created_at;
      const yearsExp = profileCreated 
        ? Math.max(1, Math.floor((Date.now() - new Date(profileCreated).getTime()) / (365.25 * 86400000)))
        : 1;

      // Weight loss average from achievements
      const weightLossAchievements = (achievementsRes.data || [])
        .filter(a => a.achievement_type === "weight_loss")
        .map(a => parseFloat(a.achievement_value.replace(/[^\d.]/g, "")) || 0)
        .filter(v => v > 0);
      const avgWeightLoss = weightLossAchievements.length > 0
        ? (weightLossAchievements.reduce((s, v) => s + v, 0) / weightLossAchievements.length).toFixed(1)
        : "0";

      return {
        goalsAchieved,
        avgWeightLoss,
        totalClients,
        yearsExp,
      };
    },
    enabled: !!trainerId,
  });

  if (!stats || (stats.goalsAchieved === 0 && stats.totalClients === 0)) return null;

  const items = [
    { value: stats.goalsAchieved, label: "عملاء أكملوا أهدافهم" },
    { value: `${stats.avgWeightLoss} كجم`, label: "متوسط الخسارة" },
    { value: `${stats.totalClients}`, label: "إجمالي العملاء" },
    { value: `${stats.yearsExp}+`, label: "سنوات الخبرة" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10" style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-3xl md:text-4xl font-black mb-1" style={{ color: brandColor }}>
              {item.value}
            </p>
            <p className="text-xs md:text-sm font-medium" style={{ color: COLORS.muted }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainerAchievementStats;
