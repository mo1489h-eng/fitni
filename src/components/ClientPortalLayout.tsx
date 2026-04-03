import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Dumbbell, Utensils, TrendingUp, User } from "lucide-react";
import ClientPortalNotifications from "@/components/ClientPortalNotifications";

const ClientPortalLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { label: "الرئيسية", href: `/portal`, icon: LayoutDashboard },
    { label: "تمريني", href: `/portal/workout`, icon: Dumbbell },
    { label: "تغذيتي", href: `/portal/nutrition`, icon: Utensils },
    { label: "تقدمي", href: `/portal/progress`, icon: TrendingUp },
    { label: "حسابي", href: `/portal/account`, icon: User },
  ];


  return (
    <div className="min-h-screen bg-[hsl(0_0%_2%)] flex flex-col" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[hsl(0_0%_8%)] bg-[hsl(0_0%_3%)]/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-sm font-bold text-white">CoachBase</span>
          <ClientPortalNotifications />
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-[hsl(0_0%_4%)] border-t border-[hsl(0_0%_8%)] z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const active = item.href === "/portal" 
              ? location.pathname === "/portal" 
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-[hsl(0_0%_35%)]"
                }`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 ${active ? "text-primary" : ""}`} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default ClientPortalLayout;
