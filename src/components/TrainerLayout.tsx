import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Hexagon, UserCheck, Zap, DollarSign, MoreHorizontal, UtensilsCrossed, Store, Trophy, Leaf, Inbox, Settings, FileText, Package, LogOut, Dumbbell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TrainerNotifications from "@/components/TrainerNotifications";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "الرئيسية", href: "/dashboard", icon: Hexagon },
  { label: "العملاء", href: "/clients", icon: UserCheck },
  { label: "إيراداتي", href: "/payments", icon: DollarSign },
  { label: "البرامج", href: "/programs", icon: Zap },
];

const moreItems = [
  { label: "باقاتي", href: "/packages", icon: Package },
  { label: "التغذية", href: "/nutrition", icon: Leaf },
  { label: "سوق البرامج", href: "/marketplace", icon: Store },
  { label: "التحديات", href: "/challenges", icon: Trophy },
  { label: "الأطعمة الخليجية", href: "/gulf-foods", icon: UtensilsCrossed },
  { label: "العملاء المحتملين", href: "/leads", icon: Inbox },
  { label: "التقارير", href: "/reports", icon: FileText },
  { label: "الإعدادات", href: "/settings", icon: Settings },
];

const TrainerLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isMoreActive = moreItems.some(item => location.pathname === item.href);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — sharp minimal */}
      <header className="sticky top-0 z-50 border-b border-border px-4 py-3" style={{ background: 'hsl(0 0% 3.1% / 0.95)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground text-lg tracking-tight">fitni</span>
          </div>
          <div className="flex items-center gap-1">
            <TrainerNotifications />
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 pb-24">{children}</main>

      {/* Bottom nav — flat dark bar, Linear style */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border" style={{ background: 'hsl(0 0% 2.5%)' }}>
        <div className="max-w-5xl mx-auto flex">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-[22px] h-[22px]" />
                {active && (
                  <span className="text-[10px] font-bold mt-0.5 text-primary">{item.label}</span>
                )}
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={`flex-1 flex flex-col items-center py-2.5 transition-all duration-200 ${isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <MoreHorizontal className="w-[22px] h-[22px]" />
                {isMoreActive && (
                  <span className="text-[10px] font-bold mt-0.5 text-primary">المزيد</span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl pb-8 border-t border-border" style={{ background: 'hsl(0 0% 4%)' }}>
              <div className="grid grid-cols-4 gap-2 py-4">
                {moreItems.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-200 ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
};

export default TrainerLayout;