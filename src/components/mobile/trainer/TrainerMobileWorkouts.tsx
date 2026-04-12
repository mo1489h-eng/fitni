import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, ChevronLeft } from "lucide-react";

const TrainerMobileWorkouts = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("programs")
        .select("id, name, description, weeks, difficulty, created_at")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false });
      setPrograms(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">البرامج</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl" style={{ background: "#161616" }} />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <Dumbbell className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>لا توجد برامج بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl p-4 transition-all active:scale-[0.98]"
              style={{ background: "#111111" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 text-xs truncate" style={{ color: "#666" }}>{p.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-lg px-2 py-1 text-[10px] font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
                      {p.weeks} أسابيع
                    </span>
                    {p.difficulty && (
                      <span className="rounded-lg px-2 py-1 text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.05)", color: "#888" }}>
                        {p.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0" style={{ color: "#333" }} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileWorkouts;
