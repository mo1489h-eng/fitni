import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePortalToken } from "@/hooks/usePortalToken";
import { CreditCard, CalendarClock, CheckCircle, History, Loader2 } from "lucide-react";

const PortalSubscription = () => {
  const { token } = usePortalToken();

  const { data: client, isLoading } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["portal-payments", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_payments")
        .select("*")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id,
  });

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  if (!client) return <ClientPortalLayout><p className="text-center py-20 text-muted-foreground">لا توجد بيانات</p></ClientPortalLayout>;

  const daysLeft = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
  const isActive = daysLeft >= 0;
  const cycleLabel = (client as any).billing_cycle === "quarterly" ? "ربع سنوي" : (client as any).billing_cycle === "yearly" ? "سنوي" : "شهري";

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">اشتراكي 💳</h1>

        {/* Current Plan */}
        <Card className={`p-5 ${isActive ? "border-primary/30" : "border-destructive/30"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-destructive/10"}`}>
              {isActive ? <CheckCircle className="w-6 h-6 text-primary" /> : <CreditCard className="w-6 h-6 text-destructive" />}
            </div>
            <div>
              <p className="font-bold text-lg text-card-foreground">{isActive ? "اشتراك نشط" : "اشتراك منتهي"}</p>
              <p className="text-sm text-muted-foreground">{cycleLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-secondary-foreground">{client.subscription_price} <span className="text-xs">ر.س</span></p>
              <p className="text-xs text-muted-foreground">المبلغ</p>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <CalendarClock className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-secondary-foreground">{isActive ? daysLeft : 0} <span className="text-xs">يوم</span></p>
              <p className="text-xs text-muted-foreground">متبقي</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>تاريخ التجديد: <span className="text-card-foreground font-medium">{new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}</span></p>
          </div>

          {!isActive && (
            <Button className="w-full mt-4" size="lg">
              تجديد الاشتراك 🔄
            </Button>
          )}
        </Card>

        {/* Payment History */}
        <Card className="p-4">
          <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> سجل المدفوعات
          </h3>
          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-secondary-foreground">{Number(p.amount)} ر.س</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <div className="text-left">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {p.status === "paid" ? "مدفوع ✅" : "معلق"}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(p.period_start).toLocaleDateString("ar-SA")} — {new Date(p.period_end).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">لا توجد مدفوعات سابقة</p>
            </div>
          )}
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalSubscription;
