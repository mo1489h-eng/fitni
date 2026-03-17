import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import TrialBanner from "@/components/TrialBanner";
import ClientOverview from "@/components/ClientOverview";
import ImportClientsModal from "@/components/ImportClientsModal";
import OnboardingTour from "@/components/OnboardingTour";
import AnimatedCounter from "@/components/AnimatedCounter";
import PremiumSkeleton from "@/components/PremiumSkeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, DollarSign, AlertTriangle, Clock, MessageCircle,
  Activity, CreditCard, Upload, Plus, ChevronLeft, Globe, Copy, Eye, Pencil,
} from "lucide-react";

function getTimeGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `صباح الخير ${name} ☀️`;
  if (h < 17) return `مرحباً ${name} 👋`;
  return `مساء الخير ${name} 🌙`;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showPlans, setShowPlans] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allMeasurements = [] } = useQuery({
    queryKey: ["dashboard-measurements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements").select("client_id, weight, recorded_at").order("recorded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalClients = clients.length;
  const monthlyRevenue = clients.reduce((sum, c) => sum + (c.subscription_price || 0), 0);

  const activeSubscriptions = clients.filter((c) => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return diff >= 0;
  }).length;

  const inactiveClients = clients.filter((c) => {
    const days = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000);
    return days >= 5;
  });

  const expiringClients = clients.filter((c) => {
    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  const activityRate = totalClients > 0
    ? Math.round(((totalClients - inactiveClients.length) / totalClients) * 100)
    : 0;

  const recentClients = clients.slice(0, 5);

  const formatWhatsApp = (phone: string) =>
    `https://wa.me/966${phone.replace(/^0/, "")}`;

  const stats = [
    { label: "العملاء", value: totalClients, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "الإيرادات", value: monthlyRevenue, icon: DollarSign, color: "text-accent-foreground", bg: "bg-accent", suffix: " ر.س" },
    { label: "النشاط", value: activityRate, icon: Activity, color: "text-warning", bg: "bg-warning/10", suffix: "%" },
  ];

  return (
    <TrainerLayout>
      <div className="space-y-5 page-enter">
        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />

        {/* ━━━ PERSONAL PAGE CARD ━━━ */}
        {profile?.username && (
          <Card className="p-4 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-card-foreground">صفحتك الشخصية 🌐</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-1 truncate" dir="ltr">fitni.lovable.app/t/{profile.username}</p>
            <p className="text-[10px] text-muted-foreground mb-3">شارك هذا الرابط في البايو أو أي مكان — أي شخص يضغطه يشوف صفحتك</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(`https://fitni.lovable.app/t/${profile.username}`); import("sonner").then(m => m.toast.success("تم نسخ الرابط العام ✅")); }}>
                <Copy className="w-3 h-3" /> نسخ الرابط
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { const url = `https://fitni.lovable.app/t/${profile.username}`; window.open(`https://wa.me/?text=${encodeURIComponent(`تفضل رابط صفحتي: ${url}`)}`, "_blank"); }}>
                <MessageCircle className="w-3 h-3" /> واتساب
              </Button>
              <Button size="sm" className="gap-1 text-xs" onClick={() => navigate("/settings/page")}>
                <Pencil className="w-3 h-3" /> تخصيص
              </Button>
            </div>
          </Card>
        )}

        {/* Greeting & Quick Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {getTimeGreeting(profile?.full_name || "")}
          </h1>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-9" onClick={() => setShowImport(true)}>
              <Upload className="w-3.5 h-3.5" />
              استيراد
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs h-9" onClick={() => setShowPlans(true)}>
              <CreditCard className="w-3.5 h-3.5" />
              الباقات
            </Button>
          </div>
        </div>

        {isLoading ? (
          <PremiumSkeleton rows={4} />
        ) : (
          <>
            {/* ━━━ 3 KEY METRICS ━━━ */}
            <div className="grid grid-cols-3 gap-3" data-tour="stats">
              {stats.map((stat, i) => (
                <Card key={stat.label} className="p-4 stat-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${stat.bg}`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-black text-card-foreground leading-none">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* ━━━ ALERTS ━━━ */}
            {inactiveClients.length === 0 && expiringClients.length === 0 && (
              <div className="rounded-xl px-4 py-2.5 bg-success/10 text-success text-sm font-medium text-center">
                ✅ كل شيء على ما يرام
              </div>
            )}

            {inactiveClients.length > 0 && (
              <Card className="p-4 border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h3 className="font-bold text-sm text-card-foreground">غير نشطين ({inactiveClients.length})</h3>
                </div>
                <div className="space-y-1.5">
                  {inactiveClients.slice(0, 3).map((c) => {
                    const days = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-background rounded-lg p-2.5 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-card-foreground">{c.name}</span>
                          <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">{days} يوم</span>
                        </div>
                        <a href={formatWhatsApp(c.phone)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-success hover:text-success">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                  {inactiveClients.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{inactiveClients.length - 3} آخرين</p>
                  )}
                </div>
              </Card>
            )}

            {expiringClients.length > 0 && (
              <Card className="p-4 border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <h3 className="font-bold text-sm text-card-foreground">ينتهي قريباً ({expiringClients.length})</h3>
                </div>
                <div className="space-y-1.5">
                  {expiringClients.slice(0, 3).map((c) => {
                    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-background rounded-lg p-2.5 border border-border">
                        <span className="text-sm font-medium text-card-foreground">{c.name}</span>
                        <span className="text-xs text-warning font-medium">{days === 0 ? "اليوم" : `${days} أيام`}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ━━━ REVENUE CARD ━━━ */}
            <Card className="p-4 cursor-pointer group" onClick={() => navigate("/payments")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-card-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  الاشتراكات
                </h3>
                <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-black text-primary tabular-nums">
                    <AnimatedCounter end={activeSubscriptions} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">نشط</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-warning tabular-nums">
                    <AnimatedCounter end={expiringClients.length} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">قريب الانتهاء</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-card-foreground tabular-nums">
                    <AnimatedCounter end={monthlyRevenue} suffix=" ر.س" />
                  </p>
                  <p className="text-[10px] text-muted-foreground">الإيرادات</p>
                </div>
              </div>
            </Card>

            {/* ━━━ RECENT ACTIVITY ━━━ */}
            {recentClients.length > 0 && (
              <Card className="p-4">
                <h3 className="font-bold text-sm text-card-foreground mb-3">آخر النشاطات</h3>
                <div className="space-y-1">
                  {recentClients.map((c) => (
                    <Link to={`/clients/${c.id}`} key={c.id}>
                      <div className="flex items-center gap-3 py-2.5 hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-all duration-200">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c.goal}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            <ClientOverview clients={clients} measurements={allMeasurements as any} />
          </>
        )}

        {/* FAB - Primary CTA */}
        <button
          onClick={() => navigate("/clients")}
          className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full btn-gradient text-primary-foreground shadow-lg flex items-center justify-center fab-premium"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
      <ImportClientsModal open={showImport} onOpenChange={setShowImport} />
      <OnboardingTour />
    </TrainerLayout>
  );
};

export default Dashboard;
