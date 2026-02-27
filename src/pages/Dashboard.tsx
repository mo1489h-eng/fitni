import TrainerLayout from "@/components/TrainerLayout";
import TrialBanner from "@/components/TrialBanner";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, DollarSign, AlertTriangle, Clock, Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalClients = clients.length;
  const monthlyRevenue = clients.reduce((sum, c) => sum + (c.subscription_price || 0), 0);

  const inactiveClients = clients.filter((c) => {
    const days = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 5;
  });

  const expiringClients = clients.filter((c) => {
    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  });

  const stats = [
    { label: "إجمالي العملاء", value: totalClients, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "الإيرادات الشهرية", value: `${monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <TrainerLayout>
      <div className="space-y-6 animate-fade-in">
        <TrialBanner />
        <h1 className="text-2xl font-bold text-foreground">مرحباً {profile?.full_name || ""} 👋</h1>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
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

            {inactiveClients.length > 0 && (
              <Card className="p-4 border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-bold text-card-foreground">عملاء غير نشطين</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">لم يسجلوا تمارين منذ 5 أيام أو أكثر</p>
                <div className="space-y-2">
                  {inactiveClients.map((c) => {
                    const days = Math.ceil((Date.now() - new Date(c.last_workout_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                        <span className="font-medium text-card-foreground">{c.name}</span>
                        <span className="text-sm text-destructive">{days} أيام</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {expiringClients.length > 0 && (
              <Card className="p-4 border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-warning" />
                  <h3 className="font-bold text-card-foreground">اشتراكات على وشك الانتهاء</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">تنتهي خلال 7 أيام أو أقل</p>
                <div className="space-y-2">
                  {expiringClients.map((c) => {
                    const days = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                        <span className="font-medium text-card-foreground">{c.name}</span>
                        <span className="text-sm text-warning">{days} أيام متبقية</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Dashboard;
