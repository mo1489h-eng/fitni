import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard, Loader2, TrendingUp, AlertCircle, Users,
  CalendarDays, ChevronDown, ChevronUp, MessageCircle, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import ClientPaymentModal from "@/components/ClientPaymentModal";
import TrainerPayoutSection from "@/components/TrainerPayoutSection";

const Payments = () => {
  const { user } = useAuth();
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeClients = clients.filter(c => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return diff >= 0;
  });
  const overdueClients = clients.filter(c => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return diff < 0;
  });
  const expiringClients = clients.filter(c => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 7;
  });

  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("ar-SA", { month: "short" });
      months[key] = 0;
    }
    payments.filter(p => p.status === "paid").forEach(p => {
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString("ar-SA", { month: "short" });
      if (months[key] !== undefined) months[key] += Number(p.amount);
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  })();

  const paidThisMonth = payments.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return p.status === "paid" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + Number(p.amount), 0);

  const commission = Math.round(paidThisMonth * 0.1);
  const netEarnings = paidThisMonth - commission;

  const StatCard = ({ icon: Icon, label, value, suffix = "", color = "text-primary", borderColor = "border-t-primary" }: any) => (
    <div className={`bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] ${borderColor} border-t-2 p-5 transition-all duration-200 hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">
        {value.toLocaleString()}{suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
      </p>
    </div>
  );

  return (
    <TrainerLayout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-primary" strokeWidth={1.5} />
            الإيرادات والمدفوعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{activeClients.length} اشتراك نشط</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={CreditCard} label="إيرادات الشهر" value={paidThisMonth} suffix="ر.س" />
              <StatCard icon={TrendingUp} label="صافي الأرباح" value={netEarnings} suffix="ر.س" />
              <StatCard icon={Users} label="اشتراكات نشطة" value={activeClients.length} />
              <StatCard
                icon={AlertCircle}
                label="متأخرات"
                value={overdueClients.length}
                color="text-destructive"
                borderColor="border-t-destructive"
              />
            </div>

            {/* Commission info */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">رسوم fitni (10%)</span>
                <span className="font-bold text-foreground tabular-nums">{commission} ر.س</span>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
                الإيرادات الشهرية
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(0 0% 53%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v} ر.س`, "الإيرادات"]}
                      contentStyle={{
                        background: "hsl(0 0% 6%)",
                        border: "1px solid hsl(0 0% 10%)",
                        borderRadius: "8px",
                        color: "hsl(0 0% 93%)",
                      }}
                    />
                    <Bar dataKey="amount" fill="hsl(142 76% 36%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Renewals */}
            {expiringClients.length > 0 && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(45_93%_47%_/_0.2)] p-5">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-warning" strokeWidth={1.5} />
                  تجديدات قادمة
                  <span className="text-xs text-muted-foreground bg-[hsl(0_0%_10%)] px-2 py-0.5 rounded-full">{expiringClients.length}</span>
                </h3>
                <div className="space-y-2">
                  {expiringClients.map(c => {
                    const daysLeft = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between bg-[hsl(45_93%_47%_/_0.05)] rounded-xl p-3.5 border border-[hsl(45_93%_47%_/_0.1)]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[hsl(0_0%_10%)] flex items-center justify-center text-sm font-bold text-foreground">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{c.name}</p>
                            <p className="text-xs text-warning">{daysLeft} يوم متبقي</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="bg-transparent border-[hsl(0_0%_10%)] hover:border-primary/40 h-8 w-8 p-0"
                            onClick={() => {
                              const phone = c.phone?.replace(/^0/, "966");
                              if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`مرحبا ${c.name}, تذكير بتجديد الاشتراك`)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </Button>
                          <Button size="sm" onClick={() => setShowPayModal(c)} className="h-8">تجديد</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client Payments List */}
            <div>
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" strokeWidth={1.5} />
                العملاء والمدفوعات
              </h3>
              <div className="space-y-2">
                {clients.map(client => {
                  const diff = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
                  const status = diff < 0 ? "overdue" : diff <= 7 ? "expiring" : "active";
                  const expanded = expandedClient === client.id;
                  const clientPayments = payments.filter(p => p.client_id === client.id);

                  const statusColors = {
                    active: "bg-primary/10 text-primary",
                    expiring: "bg-warning/10 text-warning",
                    overdue: "bg-destructive/10 text-destructive",
                  };
                  const statusLabels = { active: "نشط", expiring: "قريبا", overdue: "منتهي" };
                  const borderAccent = status === "overdue" ? "border-r-destructive" : status === "expiring" ? "border-r-warning" : "border-r-primary";

                  return (
                    <div key={client.id} className={`bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-r-[3px] ${borderAccent} overflow-hidden transition-all duration-200 hover:-translate-y-0.5`}>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-[hsl(0_0%_10%)] flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
                              {client.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-foreground text-sm">{client.name}</h3>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}>
                                  {statusLabels[status]}
                                </span>
                              </div>
                              <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">
                                {client.subscription_price}
                                <span className="text-xs font-normal text-muted-foreground mr-1">
                                  ر.س/{client.billing_cycle === "quarterly" ? "3 شهور" : client.billing_cycle === "yearly" ? "سنة" : "شهر"}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setShowPayModal(client)} className="bg-transparent border-[hsl(0_0%_10%)] hover:border-primary/40 gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} /> دفع
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setExpandedClient(expanded ? null : client.id)} className="hover:bg-[hsl(0_0%_10%)]">
                              {expanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t border-[hsl(0_0%_10%)] px-4 py-3 bg-[hsl(0_0%_4%)]">
                          <p className="text-xs font-medium text-muted-foreground mb-2">سجل المدفوعات</p>
                          {clientPayments.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">لا توجد مدفوعات مسجلة</p>
                          ) : (
                            <div className="space-y-1.5">
                              {clientPayments.slice(0, 5).map(p => (
                                <div key={p.id} className="flex items-center justify-between text-xs bg-[hsl(0_0%_6%)] rounded-lg p-2.5">
                                  <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</span>
                                  <span className="font-medium text-foreground tabular-nums">{p.amount} ر.س</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                                    {p.status === "paid" ? "مدفوع" : "معلق"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {clients.length === 0 && (
              <div className="text-center py-20">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">لا توجد بيانات مدفوعات بعد</p>
              </div>
            )}

            {/* Payout Section */}
            <TrainerPayoutSection />
          </>
        )}
      </div>

      {showPayModal && (
        <ClientPaymentModal
          open={!!showPayModal}
          onClose={() => setShowPayModal(null)}
          clientId={showPayModal.id}
          clientName={showPayModal.name}
          amount={showPayModal.subscription_price || 0}
          billingCycle={(showPayModal as any).billing_cycle || "monthly"}
          onSuccess={() => refetch()}
        />
      )}
    </TrainerLayout>
  );
};

export default Payments;
