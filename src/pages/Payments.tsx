import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, Loader2, CreditCard } from "lucide-react";

const Payments = () => {
  const { user } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalRevenue = clients.reduce((sum, c) => sum + (c.subscription_price || 0), 0);
  const overdueClients = clients.filter((c) => {
    const diff = Math.ceil((new Date(c.subscription_end_date).getTime() - Date.now()) / 86400000);
    return diff < 0;
  });

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">المدفوعات</h1>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{totalRevenue.toLocaleString()} ر.س</p>
                <p className="text-sm text-muted-foreground">الإيرادات الشهرية</p>
              </Card>
              <Card className="p-4 border-destructive/30">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-xl font-bold text-card-foreground">{overdueClients.length}</p>
                <p className="text-sm text-muted-foreground">اشتراكات منتهية</p>
              </Card>
            </div>

            <div className="space-y-3">
              {clients.map((client) => {
                const diff = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);
                const status = diff < 0 ? "overdue" : diff <= 7 ? "expiring" : "active";
                return (
                  <Card key={client.id} className={`p-4 ${status === "overdue" ? "border-destructive/30" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-card-foreground">{client.name}</h3>
                        <p className="text-lg font-bold text-card-foreground mt-1">{client.subscription_price} ر.س</p>
                        <p className="text-xs text-muted-foreground">
                          ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        status === "active" ? "bg-success/10 text-success" :
                        status === "overdue" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {status === "active" ? "نشط" : status === "overdue" ? "منتهي" : "ينتهي قريباً"}
                      </span>
                    </div>
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
          </>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Payments;
