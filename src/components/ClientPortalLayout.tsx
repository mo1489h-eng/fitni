import { Link, useLocation } from "react-router-dom";
import { Dumbbell, Home, Activity, TrendingUp } from "lucide-react";

const navItems = [
  { label: "اليوم", href: "/client-portal", icon: Home },
  { label: "التمرين", href: "/client-portal/workout", icon: Activity },
  { label: "تقدمي", href: "/client-portal/progress", icon: TrendingUp },
];

const ClientPortalLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
          <span className="font-black text-primary-foreground">مدربي</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 mb-0.5" />
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
