import { useParams, Link } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockClients, mockMeasurements, mockPayments, mockPrograms } from "@/lib/mockData";
import { ArrowRight, MessageCircle, TrendingDown, CreditCard, ClipboardList } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

const ClientProfile = () => {
  const { id } = useParams();
  const client = mockClients.find((c) => c.id === id);
  const measurements = mockMeasurements.filter((m) => m.client_id === id);
  const payments = mockPayments.filter((p) => p.client_id === id);
  const program = mockPrograms.find((p) => p.client_id === id);

  if (!client) {
    return (
      <TrainerLayout>
        <p className="text-center text-muted-foreground py-20">لم يتم العثور على العميل</p>
      </TrainerLayout>
    );
  }

  const chartData = measurements.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: m.weight,
    bodyFat: m.body_fat,
  }));

  const whatsappUrl = `https://wa.me/966${client.phone.slice(1)}`;

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

        {/* Progress Chart */}
        {chartData.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-card-foreground">تقدم الوزن</h3>
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
        )}

        {/* Current Program */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">البرنامج الحالي</h3>
          </div>
          {program ? (
            <div>
              <p className="text-card-foreground">{program.name}</p>
              <p className="text-sm text-muted-foreground">{program.weeks} أسابيع</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لا يوجد برنامج مخصص</p>
          )}
        </Card>

        {/* Measurements */}
        <Card className="p-4">
          <h3 className="font-bold text-card-foreground mb-3">سجل القياسات</h3>
          {measurements.length > 0 ? (
            <div className="space-y-2">
              {measurements.slice().reverse().map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
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
          ) : (
            <p className="text-sm text-muted-foreground">لا توجد قياسات</p>
          )}
        </Card>

        {/* Payment History */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">سجل المدفوعات</h3>
          </div>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                <div>
                  <span className="text-sm text-secondary-foreground">{p.amount} ر.س</span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.due_date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.status === "paid" ? "bg-success/10 text-success" : 
                  p.status === "overdue" ? "bg-destructive/10 text-destructive" : 
                  "bg-warning/10 text-warning"
                }`}>
                  {p.status === "paid" ? "مدفوع" : p.status === "overdue" ? "متأخر" : "معلق"}
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
