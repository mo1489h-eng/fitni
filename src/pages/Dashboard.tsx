import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { mockClients, mockPayments, getInactiveClients, getExpiringClients } from "@/lib/mockData";
import { Users, DollarSign, AlertTriangle, Clock } from "lucide-react";

const Dashboard = () => {
  const totalClients = mockClients.length;
  const monthlyRevenue = mockPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const inactiveClients = getInactiveClients(mockClients);
  const expiringClients = getExpiringClients(mockClients);

  const stats = [
    { label: "إجمالي العملاء", value: totalClients, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "الإيرادات الشهرية", value: `${monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <TrainerLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">مرحباً بك 👋</h1>

        {/* Stats */}
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

        {/* Inactive Alert */}
        {inactiveClients.length > 0 && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-bold text-card-foreground">عملاء غير نشطين</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">لم يسجلوا تمارين منذ 5 أيام أو أكثر</p>
            <div className="space-y-2">
              {inactiveClients.map((c) => {
                const days = Math.ceil((new Date().getTime() - new Date(c.last_workout_date).getTime()) / (1000 * 60 * 60 * 24));
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

        {/* Expiring Alert */}
        {expiringClients.length > 0 && (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-warning" />
              <h3 className="font-bold text-card-foreground">اشتراكات على وشك الانتهاء</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">تنتهي خلال 7 أيام أو أقل</p>
            <div className="space-y-2">
              {expiringClients.map((c) => {
                const days = Math.ceil((new Date(c.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
      </div>
    </TrainerLayout>
  );
};

export default Dashboard;
