import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, Dumbbell, Calendar, Trophy, Flame, ShieldCheck } from "lucide-react";

const COLORS = {
  card: "#111111",
  border: "#1e1e1e",
  green: "#3d5940",
  text: "#ededed",
  muted: "#888888",
  dim: "#555555",
};

const ACHIEVEMENT_ICONS: Record<string, { icon: any; color: string }> = {
  weight_loss: { icon: TrendingDown, color: "#4f6f52" },
  muscle_gain: { icon: Dumbbell, color: "#3b82f6" },
  streak: { icon: Flame, color: "#f97316" },
  program_complete: { icon: Trophy, color: "#eab308" },
  workout_milestone: { icon: Calendar, color: "#C2A878" },
};

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_value: string;
  achievement_detail: string | null;
  display_name_mode: string;
  created_at: string;
  clients?: { name: string; privacy_achievements: boolean } | null;
}

const TrainerAchievements = ({ trainerId, brandColor }: { trainerId: string; brandColor: string }) => {
  const { data: achievements = [] } = useQuery({
    queryKey: ["public-achievements", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_achievements")
        .select("id, achievement_type, achievement_value, achievement_detail, display_name_mode, created_at, clients(name, privacy_achievements)")
        .eq("trainer_id", trainerId)
        .eq("is_approved", true)
        .eq("is_visible_on_page", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []) as Achievement[];
    },
    enabled: !!trainerId,
  });

  // Filter out clients who disabled privacy_achievements
  const visibleAchievements = achievements.filter(
    (a) => a.clients?.privacy_achievements !== false
  );

  if (visibleAchievements.length === 0) return null;

  const getDisplayName = (a: Achievement) => {
    const name = a.clients?.name || "عميل";
    if (a.display_name_mode === "full_name") return name;
    if (a.display_name_mode === "first_name") return name.split(" ")[0];
    return "عميل";
  };

  return (
    <section className="px-6 py-24" style={{ borderTop: `1px solid ${COLORS.border}` }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: COLORS.text }}>
            إنجازات عملائي
          </h2>
          <p className="text-lg" style={{ color: COLORS.muted }}>
            نتائج حقيقية محققة مع عملائي
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleAchievements.map((a) => {
            const config = ACHIEVEMENT_ICONS[a.achievement_type] || ACHIEVEMENT_ICONS.weight_loss;
            const Icon = config.icon;
            return (
              <div
                key={a.id}
                className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRight: `3px solid ${brandColor}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs mb-1" style={{ color: COLORS.dim }}>
                      {getDisplayName(a)}
                    </p>
                    <p className="font-bold text-base" style={{ color: COLORS.text }}>
                      {a.achievement_value}
                    </p>
                    {a.achievement_detail && (
                      <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                        {a.achievement_detail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <ShieldCheck className="w-3 h-3" style={{ color: brandColor }} strokeWidth={1.5} />
                  <span className="text-[10px] font-medium" style={{ color: COLORS.dim }}>
                    CoachBase Verified
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrainerAchievements;
