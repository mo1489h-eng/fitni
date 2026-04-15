import { useState } from "react";
import { LayoutDashboard, Users, CalendarDays, Dumbbell, User } from "lucide-react";
import MobileTabBar from "../MobileTabBar";
import { CopilotProvider } from "../copilot/useCopilot";
import CopilotButton from "../copilot/CopilotButton";
import CopilotChat from "../copilot/CopilotChat";
import TrainerMobileHome from "./TrainerMobileHome";
import TrainerMobileClients from "./TrainerMobileClients";
import TrainerMobileSchedule from "./TrainerMobileSchedule";
import TrainerMobileWorkouts from "./TrainerMobileWorkouts";
import TrainerMobileProfile from "./TrainerMobileProfile";

interface TrainerMobileShellProps {
  onLogout: () => void;
}

const tabs = [
  { key: "home", label: "الرئيسية", icon: LayoutDashboard },
  { key: "clients", label: "العملاء", icon: Users },
  { key: "workouts", label: "البرامج", icon: Dumbbell },
  { key: "schedule", label: "الجدول", icon: CalendarDays },
  { key: "profile", label: "حسابي", icon: User },
];

const TrainerMobileShell = ({ onLogout }: TrainerMobileShellProps) => {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <CopilotProvider role="trainer">
      <div
        className="min-h-screen font-arabic antialiased"
        dir="rtl"
        style={{
          background: "#000000",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="px-4 pt-4 pb-28">
          {activeTab === "home" && <TrainerMobileHome onGoSchedule={() => setActiveTab("schedule")} />}
          {activeTab === "clients" && <TrainerMobileClients />}
          {activeTab === "schedule" && <TrainerMobileSchedule />}
          {activeTab === "workouts" && <TrainerMobileWorkouts />}
          {activeTab === "profile" && <TrainerMobileProfile onLogout={onLogout} />}
        </div>

        <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <CopilotButton />
        <CopilotChat />
      </div>
    </CopilotProvider>
  );
};

export default TrainerMobileShell;
