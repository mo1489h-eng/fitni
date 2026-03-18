import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, Loader2, CreditCard, TrendingUp, AlertTriangle, Users, CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
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

  const totalRevenue = clients.reduce((s, c) => s + (c.subscription_price || 0), 0);
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

  // Monthly revenue chart data
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

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2"><DollarSign className="w-6 h-6 text-primary" />إيراداتي</h1>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{paidThisMonth.toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                <p className="text-xs text-muted-foreground">إيرادات هذا الشهر</p>
              </Card>
              <Card className="p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{netEarnings.toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                <p className="text-xs text-muted-foreground">صافي الأرباح</p>
              </Card>
              <Card className="p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{activeClients.length}</p>
                <p className="text-xs text-muted-foreground">اشتراكات نشطة</p>
              </Card>
              <Card className="p-4 border-destructive/30">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{overdueClients.length}</p>
                <p className="text-xs text-muted-foreground">متأخرات</p>
              </Card>
            </div>

            {/* Commission info */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">رسوم fitni (10%)</span>
                <span className="font-bold text-foreground">{commission} ر.س</span>
              </div>
            </Card>

            {/* Revenue Chart */}
            <Card className="p-4">
              <h3 className="font-bold text-card-foreground mb-3 inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />الإيرادات الشهرية</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} ر.س`, "الإيرادات"]} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Upcoming Renewals */}
            {expiringClients.length > 0 && (
              <Card className="p-4 border-warning/30">
                <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-warning" />
                  تجديدات قادمة ({expiringClients.length})
                </h3>
                <div className="space-y-2">
                  {expiringClients.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-warning/5 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-card-foreground text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">ينتهي: {new Date(c.subscription_end_date).toLocaleDateString("ar-SA")}</p>
                      </div>
                      <Button size="sm" onClick={() => setShowPayModal(c)}>تجديد</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Client Payments List */}
            <h3 className="font-bold text-foreground mt-4">العملاء والمدفوعات</h3>
            <div className="space-y-2">
              {clients.map(client => {
                const diff = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
                const status = diff < 0 ? "overdue" : diff <= 7 ? "expiring" : "active";
                const expanded = expandedClient === client.id;
                const clientPayments = payments.filter(p => p.client_id === client.id);

                return (
                  <Card key={client.id} className={`overflow-hidden ${status === "overdue" ? "border-destructive/30" : ""}`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-card-foreground">{client.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              status === "active" ? "bg-primary/10 text-primary" :
                              status === "overdue" ? "bg-destructive/10 text-destructive" :
                              "bg-warning/10 text-warning"
                            }`}>
                              {status === "active" ? "نشط" : status === "overdue" ? "منتهي" : "قريباً"}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-card-foreground mt-1">{client.subscription_price} <span className="text-xs font-normal">ر.س/{(client as any).billing_cycle === "quarterly" ? "3 شهور" : (client as any).billing_cycle === "yearly" ? "سنة" : "شهر"}</span></p>
                          <p className="text-xs text-muted-foreground">ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setShowPayModal(client)}>
                            <CreditCard className="w-4 h-4 ml-1" /> دفع
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setExpandedClient(expanded ? null : client.id)}>
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-border px-4 py-3 bg-secondary/30">
                        <p className="text-xs font-medium text-muted-foreground mb-2">سجل المدفوعات</p>
                        {clientPayments.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">لا توجد مدفوعات مسجلة</p>
                        ) : (
                          <div className="space-y-1.5">
                            {clientPayments.slice(0, 5).map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <span className="text-card-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</span>
                                <span className="font-medium text-card-foreground">{p.amount} ر.س</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                                  {p.status === "paid" ? "مدفوع" : "معلق"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {clients.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>لا توجد بيانات مدفوعات بعد</p>
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
