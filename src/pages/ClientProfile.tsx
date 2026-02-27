import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MessageCircle, TrendingDown, CreditCard, ClipboardList, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

// Demo data for sections not yet in DB
const demoMeasurements = [
  { id: "m1", weight: 95, body_fat: 28, date: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: "m2", weight: 92, body_fat: 26, date: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: "m3", weight: 89, body_fat: 24, date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "m4", weight: 87, body_fat: 22, date: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: "m5", weight: 85, body_fat: 21, date: new Date().toISOString() },
];

const demoPayments = [
  { id: "p1", amount: 800, status: "paid" as const, due_date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "p2", amount: 800, status: "pending" as const, due_date: new Date(Date.now() + 5 * 86400000).toISOString() },
];

function getPaymentStatus(endDate: string): "active" | "overdue" | "expiring" {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "expiring";
  return "active";
}

const statusLabel = { active: "نشط", overdue: "متأخر", expiring: "ينتهي قريباً" };
const statusBadge = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  expiring: "bg-warning/10 text-warning",
};

const ClientProfile = () => {
  const { id } = useParams();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </TrainerLayout>
    );
  }

  if (!client) {
    return (
      <TrainerLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">لم يتم العثور على العميل</p>
          <Link to="/clients"><Button variant="outline">العودة للقائمة</Button></Link>
        </div>
      </TrainerLayout>
    );
  }

  const status = getPaymentStatus(client.subscription_end_date);
  const whatsappUrl = `https://wa.me/966${client.phone.replace(/^0/, "")}`;

  const chartData = demoMeasurements.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: m.weight,
  }));

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/clients" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.goal} • الأسبوع {client.week_number}</p>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
          </a>
        </div>

        {/* Payment Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">حالة الاشتراك</p>
              <p className="text-lg font-bold text-card-foreground">{client.subscription_price} ر.س / شهر</p>
              <p className="text-xs text-muted-foreground">
                ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}
              </p>
            </div>
            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusBadge[status]}`}>
              {statusLabel[status]}
            </span>
          </div>
        </Card>

        {/* Progress Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">تقدم الوزن</h3>
            <span className="text-xs text-muted-foreground mr-auto">(بيانات تجريبية)</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} name="الوزن (كجم)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Current Program */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">البرنامج الحالي</h3>
          </div>
          <p className="text-sm text-muted-foreground">لا يوجد برنامج مخصص بعد</p>
        </Card>

        {/* Measurements */}
        <Card className="p-4">
          <h3 className="font-bold text-card-foreground mb-3">سجل القياسات</h3>
          <div className="space-y-2">
            {demoMeasurements.slice().reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg p-3 bg-secondary">
                <span className="text-sm text-secondary-foreground">
                  {new Date(m.date).toLocaleDateString("ar-SA")}
                </span>
                <div className="flex gap-4 text-sm">
                  <span className="text-secondary-foreground">{m.weight} كجم</span>
                  <span className="text-muted-foreground">{m.body_fat}% دهون</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">سجل المدفوعات</h3>
            <span className="text-xs text-muted-foreground mr-auto">(بيانات تجريبية)</span>
          </div>
          <div className="space-y-2">
            {demoPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg p-3 bg-secondary">
                <div>
                  <span className="text-sm text-secondary-foreground">{p.amount} ر.س</span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.due_date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  {p.status === "paid" ? "مدفوع" : "معلق"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TrainerLayout>
  );
};

export default ClientProfile;
