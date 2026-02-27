import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockClients, mockPayments } from "@/lib/mockData";
import { DollarSign, Check } from "lucide-react";

const Payments = () => {
  const totalRevenue = mockPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueCount = mockPayments.filter((p) => p.status === "overdue").length;

  const getClientName = (clientId: string) =>
    mockClients.find((c) => c.id === clientId)?.name || "غير معروف";

  const sortedPayments = [...mockPayments].sort((a, b) => {
    const order = { overdue: 0, pending: 1, paid: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">المدفوعات</h1>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xl font-bold text-card-foreground">{totalRevenue.toLocaleString()} ر.س</p>
            <p className="text-sm text-muted-foreground">الإيرادات المحصلة</p>
          </Card>
          <Card className="p-4 border-destructive/30">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-xl font-bold text-card-foreground">{overdueCount}</p>
            <p className="text-sm text-muted-foreground">مدفوعات متأخرة</p>
          </Card>
        </div>

        {/* Payment List */}
        <div className="space-y-3">
          {sortedPayments.map((payment) => (
            <Card
              key={payment.id}
              className={`p-4 ${payment.status === "overdue" ? "border-destructive/30" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-card-foreground">{getClientName(payment.client_id)}</h3>
                  <p className="text-lg font-bold text-card-foreground mt-1">{payment.amount} ر.س</p>
                  <p className="text-xs text-muted-foreground">
                    الاستحقاق: {new Date(payment.due_date).toLocaleDateString("ar-SA")}
                  </p>
                  {payment.paid_date && (
                    <p className="text-xs text-success">
                      مدفوع: {new Date(payment.paid_date).toLocaleDateString("ar-SA")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    payment.status === "paid" ? "bg-success/10 text-success" :
                    payment.status === "overdue" ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {payment.status === "paid" ? "مدفوع" : payment.status === "overdue" ? "متأخر" : "معلق"}
                  </span>
                  {payment.status !== "paid" && (
                    <Button size="sm" variant="outline" className="gap-1">
                      <Check className="w-3 h-3" />
                      تم الدفع
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </TrainerLayout>
  );
};

export default Payments;
