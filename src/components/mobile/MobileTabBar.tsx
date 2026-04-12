import { type LucideIcon } from "lucide-react";

interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface MobileTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

const MobileTabBar = ({ tabs, activeTab, onTabChange }: MobileTabBarProps) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-end justify-around px-2 pt-1.5 pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-all duration-200 active:scale-95"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300"
                style={{
                  background: active ? "rgba(34,197,94,0.15)" : "transparent",
                }}
              >
                <tab.icon
                  className="h-5 w-5 transition-colors duration-300"
                  strokeWidth={active ? 2 : 1.5}
                  style={{ color: active ? "#22C55E" : "#555" }}
                />
              </div>
              <span
                className="text-[10px] font-medium transition-colors duration-300"
                style={{ color: active ? "#22C55E" : "#555" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
