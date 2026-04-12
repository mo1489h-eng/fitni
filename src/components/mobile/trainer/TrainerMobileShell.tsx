import { useState } from "react";
import { LayoutDashboard, Users, CalendarDays, Dumbbell, User } from "lucide-react";
import MobileTabBar from "../MobileTabBar";
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
  { key: "schedule", label: "الجدول", icon: CalendarDays },
  { key: "workouts", label: "البرامج", icon: Dumbbell },
  { key: "profile", label: "حسابي", icon: User },
];

const TrainerMobileShell = ({ onLogout }: TrainerMobileShellProps) => {
  const [activeTab, setActiveTab] = useState("home");

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
        {activeTab === "home" && <TrainerMobileHome />}
        {activeTab === "clients" && <TrainerMobileClients />}
        {activeTab === "schedule" && <TrainerMobileSchedule />}
        {activeTab === "workouts" && <TrainerMobileWorkouts />}
        {activeTab === "profile" && <TrainerMobileProfile onLogout={onLogout} />}
      </div>

      <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default TrainerMobileShell;
