import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, List, BarChart3, User } from "lucide-react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import MobileTabBar from "../MobileTabBar";
import ClientMobileHome from "./ClientMobileHome";
import ClientMobileProgram from "./ClientMobileProgram";
import ClientMobileProgress from "./ClientMobileProgress";
import ClientMobileAccount from "./ClientMobileAccount";
import WorkoutSessionFlow from "../workout/WorkoutSessionFlow";

const tabs = [
  { key: "workout", label: "تمريني", icon: Dumbbell },
  { key: "program", label: "برنامجي", icon: List },
  { key: "progress", label: "تقدمي", icon: BarChart3 },
  { key: "account", label: "حسابي", icon: User },
];

const ClientMobileShell = () => {
  const [activeTab, setActiveTab] = useState("workout");
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const token = useMobilePortalToken();

  const { data: clientRow } = useQuery({
    queryKey: ["mobile-portal-client", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row as { id: string } | null;
    },
    enabled: !!token,
  });

  return (
    <div
      className="min-h-screen font-arabic antialiased"
      dir="rtl"
      style={{
        background: "hsl(var(--background))",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="px-4 pt-4 pb-28">
        {activeTab === "workout" && (
          <ClientMobileHome
            onStartWorkout={() => setWorkoutOpen(true)}
            canStartWorkout={!!clientRow?.id && !!token}
          />
        )}
        {activeTab === "program" && <ClientMobileProgram />}
        {activeTab === "progress" && <ClientMobileProgress />}
        {activeTab === "account" && <ClientMobileAccount />}
      </div>

      <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {workoutOpen && clientRow?.id && token && (
        <WorkoutSessionFlow
          clientId={clientRow.id}
          portalToken={token}
          onClose={() => setWorkoutOpen(false)}
        />
      )}
    </div>
  );
};

export default ClientMobileShell;
