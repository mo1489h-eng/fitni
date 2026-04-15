import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, TrendingUp, CalendarDays, MessageCircle, User } from "lucide-react";
import { useMobilePortalToken } from "@/hooks/useMobilePortalToken";
import { supabase } from "@/integrations/supabase/client";
import MobileTabBar from "../MobileTabBar";
import { CopilotProvider } from "../copilot/useCopilot";
import CopilotButton from "../copilot/CopilotButton";
import CopilotChat from "../copilot/CopilotChat";
import ClientMobileHome from "./ClientMobileHome";
import ClientMobileProgram from "./ClientMobileProgram";
import ClientMobileProgress from "./ClientMobileProgress";
import ClientMobileChat from "./ClientMobileChat";
import ClientMobileSchedule from "./ClientMobileSchedule";
import ClientMobileAccount from "./ClientMobileAccount";
import WorkoutSessionFlow from "../workout/WorkoutSessionFlow";

const tabs = [
  { key: "workout", label: "تمريني", icon: Dumbbell },
  { key: "achievements", label: "إنجازاتي", icon: TrendingUp },
  { key: "schedule", label: "الجدول", icon: CalendarDays },
  { key: "chat", label: "المحادثة", icon: MessageCircle },
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
    <CopilotProvider role="client" clientId={clientRow?.id ?? null} clientReady={!!clientRow?.id}>
      <div
        className="min-h-screen font-arabic antialiased"
        dir="rtl"
        style={{
          background: "#000000",
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
          {activeTab === "achievements" && <ClientMobileProgress />}
          {activeTab === "schedule" && <ClientMobileSchedule />}
          {activeTab === "chat" && <ClientMobileChat />}
          {activeTab === "account" && <ClientMobileAccount />}
        </div>

        <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        {clientRow?.id && (
          <>
            <CopilotButton />
            <CopilotChat />
          </>
        )}

        {workoutOpen && clientRow?.id && token && (
          <WorkoutSessionFlow
            clientId={clientRow.id}
            portalToken={token}
            onClose={() => setWorkoutOpen(false)}
          />
        )}
      </div>
    </CopilotProvider>
  );
};

export default ClientMobileShell;
