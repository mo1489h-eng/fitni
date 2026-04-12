import { useEffect, useState } from "react";
import { usePortalToken } from "@/hooks/usePortalToken";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, TrendingUp, Flame, Target } from "lucide-react";

const ClientMobileHome = () => {
  const { token } = usePortalToken();
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      const { data } = await supabase.rpc("get_portal_workout_stats" as any, { p_token: token });
      if (data) setClientData(data);
    };
    fetch();
  }, [token]);

  const name = clientData?.client_name?.split(" ")[0] || "المتدرب";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm" style={{ color: "#666" }}>مرحباً</p>
        <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "الالتزام", value: "87%", icon: Target, color: "#22C55E" },
          { label: "السلسلة", value: "5 أيام", icon: Flame, color: "#F59E0B" },
          { label: "التمارين", value: "24", icon: Dumbbell, color: "#3B82F6" },
          { label: "التقدم", value: "+3kg", icon: TrendingUp, color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "#111111" }}>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${s.color}15` }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} strokeWidth={1.5} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[11px]" style={{ color: "#666" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Workout Card */}
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.1)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="h-5 w-5" style={{ color: "#22C55E" }} strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-white">تمرين اليوم</h3>
        </div>
        <p className="text-xs" style={{ color: "#999" }}>
          {clientData?.today_workout || "لا يوجد تمرين مجدول لليوم"}
        </p>
      </div>
    </div>
  );
};

export default ClientMobileHome;
