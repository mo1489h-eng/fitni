import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Settings, CreditCard, Bell } from "lucide-react";

interface TrainerMobileProfileProps {
  onLogout: () => void;
}

const TrainerMobileProfile = ({ onLogout }: TrainerMobileProfileProps) => {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const trainerName = profile?.full_name || "المدرب";
  const planLabel =
    profile?.subscription_plan === "pro" ? "الخطة الاحترافية"
    : profile?.subscription_plan === "basic" ? "الخطة الأساسية"
    : "الفترة المجانية";

  const menuItems = [
    { label: "الملف الشخصي", icon: User },
    { label: "الإشعارات", icon: Bell },
    { label: "الاشتراك", icon: CreditCard },
    { label: "الإعدادات", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="flex items-center gap-4 rounded-2xl p-5" style={{ background: "#111111" }}>
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
        >
          {trainerName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{trainerName}</h2>
          <span
            className="mt-1 inline-block rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
          >
            {planLabel}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#111111" }}>
        {menuItems.map((item, i) => (
          <button
            key={item.label}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-white transition-all active:bg-white/5"
            style={{ borderBottom: i < menuItems.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
          >
            <item.icon className="h-5 w-5" style={{ color: "#666" }} strokeWidth={1.5} />
            <span className="flex-1 text-right">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-medium transition-all active:scale-[0.98]"
        style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        تسجيل الخروج
      </button>
    </div>
  );
};

export default TrainerMobileProfile;
