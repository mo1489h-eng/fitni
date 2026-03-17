import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dumbbell, LayoutDashboard, Users, ClipboardList, LogOut, DollarSign, MoreHorizontal, UtensilsCrossed, Store, Trophy, Apple, Inbox, Settings, FileText, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TrainerNotifications from "@/components/TrainerNotifications";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", href: "/clients", icon: Users },
  { label: "إيراداتي", href: "/payments", icon: DollarSign },
  { label: "البرامج", href: "/programs", icon: ClipboardList },
];

const moreItems = [
  { label: "باقاتي", href: "/packages", icon: Package },
  { label: "التغذية", href: "/nutrition", icon: UtensilsCrossed },
  { label: "سوق البرامج", href: "/marketplace", icon: Store },
  { label: "التحديات", href: "/challenges", icon: Trophy },
  { label: "الأطعمة الخليجية", href: "/gulf-foods", icon: Apple },
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
      {/* Header with glass effect */}
      <header className="sticky top-0 z-50 glass border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-black text-foreground text-lg tracking-tight">fitni</span>
          </div>
          <div className="flex items-center gap-2">
            <TrainerNotifications />
            <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 pb-24">{children}</main>

      {/* Bottom nav with glass */}
      <nav className="fixed bottom-0 inset-x-0 glass border-t border-border z-50">
        <div className="max-w-5xl mx-auto flex">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`relative p-1 ${active ? "" : ""}`}>
                  <item.icon className="w-5 h-5" />
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-all duration-200 ${isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <MoreHorizontal className="w-5 h-5" />
                <span className="mt-0.5">المزيد</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8 glass">
              <div className="grid grid-cols-4 gap-3 py-4">
                {moreItems.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
