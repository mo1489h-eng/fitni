import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import TrialBanner from "@/components/TrialBanner";
import {
  Users, TrendingDown, TrendingUp, Minus, Activity,
  DollarSign, AlertTriangle, Loader2, Send, MessageCircle,
  CheckCircle, XCircle, Clock, Lock,
} from "lucide-react";

const Reports = () => {
  const { user } = useAuth();
  const { hasReportsAccess, plan } = usePlanLimits();
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["report-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery({
    queryKey: ["report-measurements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements").select("*").order("recorded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = loadingClients || loadingMeasurements;

  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;

  const getClientReport = (client: typeof clients[0]) => {
    const clientMeasurements = measurements.filter((m) => m.client_id === client.id);
    const recentMeasurements = clientMeasurements.filter((m) => new Date(m.recorded_at).getTime() >= oneWeekAgo);

    // Weight change
    const sorted = clientMeasurements.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    const latestWeight = sorted[0]?.weight || 0;
    const previousWeight = sorted[1]?.weight || latestWeight;
    const weightChange = latestWeight - previousWeight;

    // Days since last workout
    const lastWorkoutDays = Math.ceil((now - new Date(client.last_workout_date).getTime()) / 86400000);

    // Payment status
    const subEndDate = new Date(client.subscription_end_date).getTime();
    const isPaid = subEndDate >= now;
    const daysLeft = Math.ceil((subEndDate - now) / 86400000);

    // Weekly commitment (using measurements as proxy - target 5/week)
    const weeklyTarget = 5;
    const weeklyDone = recentMeasurements.length > weeklyTarget ? weeklyTarget : recentMeasurements.length;

    return { weightChange, latestWeight, lastWorkoutDays, isPaid, daysLeft, weeklyDone, weeklyTarget };
  };

  // Summary stats
  const activeClients = clients.filter((c) => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - now) / 86400000);
    return diff >= 0;
  });

  const overdueClients = clients.filter((c) => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - now) / 86400000);
    return diff < 0;
  });

  const monthlyRevenue = clients.reduce((sum, c) => sum + (c.subscription_price || 0), 0);

  const avgCommitment = clients.length > 0
    ? Math.round(
        clients.reduce((sum, c) => {
          const r = getClientReport(c);
          return sum + (r.weeklyDone / r.weeklyTarget) * 100;
        }, 0) / clients.length
      )
    : 0;

  const formatWhatsApp = (phone: string, message: string) =>
    `https://wa.me/966${phone.replace(/^0/, "")}?text=${encodeURIComponent(message)}`;

  const getWhatsAppMessage = (client: typeof clients[0]) => {
    const r = getClientReport(client);
    const weightStr = r.latestWeight > 0 ? `${r.latestWeight}kg` : "—";
    return `أهلاً ${client.name} 👋\n\nتقريرك الأسبوعي:\n\n✅ التمارين: ${r.weeklyDone}/${r.weeklyTarget}\n⚖️ الوزن: ${weightStr}\n\n💪 استمر!`;
  };

  const handleSendAll = () => {
    clients.forEach((client, index) => {
      setTimeout(() => {
        setSendingIndex(index);
        const msg = getWhatsAppMessage(client);
        window.open(formatWhatsApp(client.phone, msg), "_blank");
        if (index === clients.length - 1) {
          setTimeout(() => setSendingIndex(null), 1000);
        }
      }, index * 1500);
    });
  };

  const summaryStats = [
    { label: "العملاء النشطين", value: activeClients.length, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "متوسط الالتزام", value: `${avgCommitment}%`, icon: Activity, color: "bg-accent text-accent-foreground" },
    { label: "إيرادات الشهر", value: `${monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign, color: "bg-success/10 text-success" },
    { label: "متأخرين بالدفع", value: overdueClients.length, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  ];

  // If not pro/gym, show locked state
  if (!hasReportsAccess) {
    return (
      <TrainerLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground">التقارير المتقدمة</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            التقارير المتقدمة متاحة في الباقة الاحترافية وباقة الجيم
          </p>
          <Button onClick={() => setShowPlans(true)}>ترقية الآن</Button>
          <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">التقارير 📊</h1>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleSendAll}
            disabled={clients.length === 0 || sendingIndex !== null}
          >
            <Send className="w-4 h-4" />
            إرسال للكل
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              {summaryStats.map((stat) => (
                <Card key={stat.label} className="p-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              ))}
            </div>

            {/* Client Reports */}
            <h2 className="text-lg font-bold text-foreground">تقرير العملاء</h2>
            <div className="space-y-3">
              {clients.map((client, index) => {
                const r = getClientReport(client);
                const WeightIcon = r.weightChange < 0 ? TrendingDown : r.weightChange > 0 ? TrendingUp : Minus;
                const weightColor = r.weightChange < 0 ? "text-success" : r.weightChange > 0 ? "text-destructive" : "text-muted-foreground";

                return (
                  <Card key={client.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-card-foreground">{client.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-success hover:text-success"
                        onClick={() => {
                          const msg = getWhatsAppMessage(client);
                          window.open(formatWhatsApp(client.phone, msg), "_blank");
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Commitment */}
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground">الالتزام</p>
                          <p className="font-semibold text-card-foreground">
                            {r.weeklyDone}/{r.weeklyTarget} تمارين {r.weeklyDone >= r.weeklyTarget ? "✅" : ""}
                          </p>
                        </div>
                      </div>

                      {/* Weight Change */}
                      <div className="flex items-center gap-2">
                        <WeightIcon className={`w-4 h-4 flex-shrink-0 ${weightColor}`} />
                        <div>
                          <p className="text-muted-foreground">تغير الوزن</p>
                          <p className={`font-semibold ${weightColor}`}>
                            {r.weightChange === 0 ? "ثابت" : `${r.weightChange > 0 ? "+" : ""}${r.weightChange.toFixed(1)}kg`}
                          </p>
                        </div>
                      </div>

                      {/* Last Activity */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-warning flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground">آخر تسجيل</p>
                          <p className="font-semibold text-card-foreground">
                            {r.lastWorkoutDays === 0 ? "اليوم" : `منذ ${r.lastWorkoutDays} يوم`}
                          </p>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="flex items-center gap-2">
                        {r.isPaid ? (
                          <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-muted-foreground">حالة الدفع</p>
                          <p className={`font-semibold ${r.isPaid ? "text-success" : "text-destructive"}`}>
                            {r.isPaid ? "مدفوع" : "متأخر"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {sendingIndex === index && (
                      <div className="mt-2 text-xs text-primary text-center animate-pulse">
                        جاري إرسال التقرير...
                      </div>
                    )}
                  </Card>
                );
              })}

              {clients.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  لا يوجد عملاء بعد
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Reports;
