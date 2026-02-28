import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dumbbell, LayoutDashboard, Users, ClipboardList, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "البرامج", href: "/programs", icon: ClipboardList },
  { label: "المدفوعات", href: "/payments", icon: CreditCard },
];

const TrainerLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground">fitni</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50">
        <div className="max-w-5xl mx-auto flex">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className="w-5 h-5 mb-1" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default TrainerLayout;
