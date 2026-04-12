import { useState } from "react";
import { LayoutDashboard, Dumbbell, TrendingUp, MessageCircle } from "lucide-react";
import MobileTabBar from "../MobileTabBar";
import ClientMobileHome from "./ClientMobileHome";
import ClientMobileProgram from "./ClientMobileProgram";
import ClientMobileProgress from "./ClientMobileProgress";
import ClientMobileChat from "./ClientMobileChat";

const tabs = [
  { key: "home", label: "الرئيسية", icon: LayoutDashboard },
  { key: "program", label: "برنامجي", icon: Dumbbell },
  { key: "progress", label: "تقدمي", icon: TrendingUp },
  { key: "chat", label: "المحادثة", icon: MessageCircle },
];

const ClientMobileShell = () => {
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
        {activeTab === "home" && <ClientMobileHome />}
        {activeTab === "program" && <ClientMobileProgram />}
        {activeTab === "progress" && <ClientMobileProgress />}
        {activeTab === "chat" && <ClientMobileChat />}
      </div>

      <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default ClientMobileShell;
