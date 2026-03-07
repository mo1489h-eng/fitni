import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import TrialBanner from "@/components/TrialBanner";
import ClientOverview from "@/components/ClientOverview";
import ImportClientsModal from "@/components/ImportClientsModal";
import OnboardingTour from "@/components/OnboardingTour";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, DollarSign, AlertTriangle, Clock, Loader2,
  MessageCircle, CheckCircle, Activity, CreditCard, Upload,
} from "lucide-react";

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

  // Recent activity: last 5 clients added
  const recentClients = clients.slice(0, 5);

  const stats = [
    { label: "إجمالي العملاء", value: totalClients, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "الإيرادات الشهرية", value: `${monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign, color: "bg-accent text-accent-foreground" },
    { label: "اشتراكات نشطة", value: activeSubscriptions, icon: CheckCircle, color: "bg-success/10 text-success" },
    { label: "معدل النشاط", value: totalClients > 0 ? `${Math.round(((totalClients - inactiveClients.length) / totalClients) * 100)}%` : "—", icon: Activity, color: "bg-warning/10 text-warning" },
  ];

  const formatWhatsApp = (phone: string) =>
    `https://wa.me/966${phone.replace(/^0/, "")}`;

  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in">
        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">مرحباً {profile?.full_name || ""} 👋</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowImport(true)}>
              <Upload className="w-3.5 h-3.5" />
              استيراد عملاء
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => {
              clients.forEach((c, i) => {
                const phone = `966${c.phone.replace(/^0/, "")}`;
                const msg = encodeURIComponent(`أهلاً ${c.name}! تذكر تمرينك اليوم 💪 لا تفوّته!`);
                setTimeout(() => window.open(`https://wa.me/${phone}?text=${msg}`, "_blank"), i * 500);
              });
            }}>
              <MessageCircle className="w-3.5 h-3.5" />
              تذكير الكل
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowPlans(true)}>
              <CreditCard className="w-4 h-4" />
              الباقات
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <Card key={stat.label} className="p-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* Alerts Section */}
            {inactiveClients.length === 0 && expiringClients.length === 0 && (
              <div className="rounded-xl px-4 py-3 bg-success/10 text-success text-sm font-medium text-center">
                ✅ كل شيء على ما يرام
              </div>
            )}

            {/* Inactive Clients Alert */}
            {inactiveClients.length > 0 && (
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-bold text-card-foreground">عملاء غير نشطين ({inactiveClients.length})</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">لم يسجلوا تمارين منذ 5 أيام أو أكثر</p>
                <div className="space-y-2">
                  {inactiveClients.map((c) => {
                    const days = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-card-foreground">{c.name}</span>
                          <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">{days} يوم</span>
                        </div>
                        <a href={formatWhatsApp(c.phone)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-success hover:text-success">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Expiring Subscriptions Alert */}
            {expiringClients.length > 0 && (
              <Card className="p-4 border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-warning" />
                  <h3 className="font-bold text-card-foreground">اشتراكات على وشك الانتهاء ({expiringClients.length})</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">تنتهي خلال 7 أيام أو أقل</p>
                <div className="space-y-2">
                  {expiringClients.map((c) => {
                    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                        <span className="font-medium text-card-foreground">{c.name}</span>
                        <span className="text-sm text-warning font-medium">{days === 0 ? "اليوم" : `${days} أيام`}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Recent Activity */}
            {recentClients.length > 0 && (
              <Card className="p-4">
                <h3 className="font-bold text-card-foreground mb-3">آخر النشاطات</h3>
                <div className="space-y-3">
                  {recentClients.map((c) => (
                    <Link to={`/clients/${c.id}`} key={c.id}>
                      <div className="flex items-center gap-3 py-2 hover:bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">تم إضافة {c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{c.goal}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Client Subscriptions Card */}
            <Card className="p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/payments")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-card-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  اشتراكات العملاء 💰
                </h3>
                <span className="text-xs text-primary">عرض الكل ←</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{activeSubscriptions}</p>
                  <p className="text-[10px] text-muted-foreground">نشط</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warning">{expiringClients.length}</p>
                  <p className="text-[10px] text-muted-foreground">قريب الانتهاء</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-card-foreground">{monthlyRevenue.toLocaleString()} <span className="text-xs">ر.س</span></p>
                  <p className="text-[10px] text-muted-foreground">الإيرادات</p>
                </div>
              </div>
            </Card>

            {/* Client Quick Overview */}
            <ClientOverview clients={clients} measurements={allMeasurements as any} />
          </>
        )}
      </div>
      <ImportClientsModal open={showImport} onOpenChange={setShowImport} />
      <OnboardingTour />
    </TrainerLayout>
  );
};

export default Dashboard;
