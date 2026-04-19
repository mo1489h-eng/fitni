import { useState } from "react";
import { CalendarDays, Users, Zap, User } from "lucide-react";
import MobileTabBar from "../MobileTabBar";
import TrainerMobileSchedule from "./TrainerMobileSchedule";
import TrainerMobileClients from "./TrainerMobileClients";
import TrainerMobileSessionHub from "./TrainerMobileSessionHub";
import TrainerMobileProfile from "./TrainerMobileProfile";
import { MobileTabErrorBoundary } from "../MobileTabErrorBoundary";

interface TrainerMobileShellProps {
  onLogout: () => void;
}

const tabs = [
  { key: "today", label: "اليوم", icon: CalendarDays },
  { key: "clients", label: "العملاء", icon: Users },
  { key: "session", label: "جلسة", icon: Zap },
  { key: "profile", label: "حسابي", icon: User },
];

const TrainerMobileShell = ({ onLogout }: TrainerMobileShellProps) => {
  const [activeTab, setActiveTab] = useState("today");

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
        {activeTab === "today" && <TrainerMobileSchedule />}
        {activeTab === "clients" && <TrainerMobileClients />}
        {activeTab === "session" && <TrainerMobileSessionHub />}
        {activeTab === "profile" && (
          <MobileTabErrorBoundary tabLabel="حسابي">
            <TrainerMobileProfile onLogout={onLogout} />
          </MobileTabErrorBoundary>
        )}
      </div>

      <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default TrainerMobileShell;
