import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { hapticImpact } from "./workout/haptics";
import { eliteSpring } from "./elite/spring";

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

const ACCENT = "#4f6f52";

const MobileTabBar = ({ tabs, activeTab, onTabChange }: MobileTabBarProps) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-end justify-around px-4 pb-2 pt-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={eliteSpring}
              onPointerDown={() => void hapticImpact("light")}
              onClick={() => onTabChange(tab.key)}
              className="flex min-h-[48px] min-w-[56px] flex-1 flex-col items-center gap-1 py-2"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl transition-colors duration-200"
                style={{
                  background: active ? "rgba(79,111,82,0.15)" : "transparent",
                }}
              >
                <tab.icon
                  className="h-5 w-5 transition-colors duration-200"
                  strokeWidth={active ? 2 : 1.5}
                  style={{ color: active ? ACCENT : "#71717A" }}
                />
              </div>
              <span
                className="text-[10px] font-medium transition-colors duration-200"
                style={{ color: active ? ACCENT : "#71717A" }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
