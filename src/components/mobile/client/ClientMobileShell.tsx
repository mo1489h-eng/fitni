import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Dumbbell, TrendingUp, MessageCircle } from "lucide-react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import MobileTabBar from "../MobileTabBar";
import ClientMobileHome from "./ClientMobileHome";
import ClientMobileProgram from "./ClientMobileProgram";
import ClientMobileProgress from "./ClientMobileProgress";
import ClientMobileChat from "./ClientMobileChat";
import WorkoutSessionFlow from "../workout/WorkoutSessionFlow";

const tabs = [
  { key: "home", label: "الرئيسية", icon: LayoutDashboard },
  { key: "program", label: "برنامجي", icon: Dumbbell },
  { key: "progress", label: "تقدمي", icon: TrendingUp },
  { key: "chat", label: "المحادثة", icon: MessageCircle },
];

const ClientMobileShell = () => {
  const [activeTab, setActiveTab] = useState("home");
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
      className="min-h-screen"
      dir="rtl"
      style={{
        background: "#0A0A0A",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="px-5 pt-4 pb-28">
        {activeTab === "home" && (
          <ClientMobileHome
            onStartWorkout={() => setWorkoutOpen(true)}
            canStartWorkout={!!clientRow?.id && !!token}
          />
        )}
        {activeTab === "program" && <ClientMobileProgram />}
        {activeTab === "progress" && <ClientMobileProgress />}
        {activeTab === "chat" && <ClientMobileChat />}
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
