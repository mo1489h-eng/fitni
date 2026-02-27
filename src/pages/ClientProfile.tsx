import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, TrendingDown, TrendingUp, CreditCard, ClipboardList,
  Loader2, ArrowLeft, Check, Dumbbell, Scale, Flame, Calendar, Copy, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";

// Demo data
const demoMeasurements = [
  { id: "m1", weight: 95, body_fat: 28, date: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: "m2", weight: 92, body_fat: 26, date: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: "m3", weight: 89, body_fat: 24, date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "m4", weight: 87, body_fat: 22, date: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: "m5", weight: 85, body_fat: 21, date: new Date().toISOString() },
];

const demoPayments = [
  { id: "p1", amount: 800, status: "paid" as const, due_date: new Date(Date.now() - 60 * 86400000).toISOString(), paid_date: new Date(Date.now() - 58 * 86400000).toISOString() },
  { id: "p2", amount: 800, status: "paid" as const, due_date: new Date(Date.now() - 30 * 86400000).toISOString(), paid_date: new Date(Date.now() - 28 * 86400000).toISOString() },
  { id: "p3", amount: 800, status: "overdue" as const, due_date: new Date(Date.now() - 3 * 86400000).toISOString() },
];

const demoProgramDays = [
  { day: 1, name: "صدر وترايسبس", done: true, exercises: ["بنش بريس 4×10", "تفتيح دمبل 3×12", "بوش أب 3×15", "تراي بوش داون 3×12"] },
  { day: 2, name: "ظهر وبايسبس", done: true, exercises: ["سحب أمامي 4×10", "تجديف بار 4×10", "بايسبس كيرل 3×12", "هامر كيرل 3×12"] },
  { day: 3, name: "أرجل", done: true, exercises: ["سكوات 4×10", "ليق بريس 4×12", "ليق اكستنشن 3×12", "ليق كيرل 3×12"] },
  { day: 4, name: "أكتاف وبطن", done: false, exercises: ["شولدر بريس 4×10", "رفرفة جانبية 3×15", "كرنش 3×20", "بلانك 3×45ث"] },
  { day: 5, name: "ذراع وكارديو", done: false, exercises: ["بايسبس بار 4×10", "تراي فرنش بريس 4×10", "كارديو 20 دقيقة"] },
  { day: 6, name: "راحة نشطة", done: false, exercises: ["مشي 30 دقيقة", "تمدد 15 دقيقة"] },
];

type TabKey = "overview" | "program" | "payments" | "measurements";
const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "program", label: "البرنامج" },
  { key: "payments", label: "المدفوعات" },
  { key: "measurements", label: "القياسات" },
];

function getPaymentStatus(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "expiring";
  return "active";
}

const ClientProfile = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [newWeight, setNewWeight] = useState("");
  const [newFat, setNewFat] = useState("");
  const { toast } = useToast();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></TrainerLayout>;
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
  const initials = client.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
  const totalWeeks = 12;
  const progressPercent = Math.min((client.week_number / totalWeeks) * 100, 100);
  const weightLost = demoMeasurements[0].weight - demoMeasurements[demoMeasurements.length - 1].weight;
  const lastWorkoutDays = Math.ceil((Date.now() - new Date(client.last_workout_date).getTime()) / 86400000);
  const adherence = Math.round((demoProgramDays.filter((d) => d.done).length / demoProgramDays.length) * 100);

  const chartData = demoMeasurements.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: m.weight,
  }));

  const overduePayment = demoPayments.find((p) => p.status === "overdue");
  const overdueAmount = demoPayments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Back + WhatsApp */}
        <div className="flex items-center justify-between">
          <Link to="/clients" className="flex items-center gap-1 text-sm text-primary hover:underline font-medium">
            العملاء
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
          </a>
        </div>

        {/* Header Card */}
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-card-foreground truncate">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{client.goal}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  الأسبوع {client.week_number}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>الأسبوع {client.week_number} من {totalWeeks}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* 4 Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "الوزن", value: `${demoMeasurements[demoMeasurements.length - 1].weight}`, unit: "كجم", icon: Scale },
              { label: "خسر", value: `${weightLost}`, unit: "كجم", icon: Flame },
              { label: "الالتزام", value: `${adherence}`, unit: "%", icon: Check },
              { label: "آخر تمرين", value: lastWorkoutDays === 0 ? "اليوم" : `${lastWorkoutDays}`, unit: lastWorkoutDays === 0 ? "" : "يوم", icon: Calendar },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-secondary rounded-lg p-2.5">
                <stat.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-base font-bold text-secondary-foreground leading-none">
                  {stat.value}<span className="text-xs font-normal text-muted-foreground mr-0.5">{stat.unit}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Portal Link */}
        {client.portal_token && (
          <Card className="p-4">
            <h3 className="font-bold text-card-foreground mb-2">رابط المتدرب</h3>
            <p className="text-xs text-muted-foreground mb-3">شارك هذا الرابط مع عميلك لمتابعة تمارينه</p>
            <div className="bg-secondary rounded-lg p-2.5 text-xs text-secondary-foreground dir-ltr text-left mb-3 break-all">
              {window.location.origin}/client-portal/{client.portal_token}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/client-portal/${client.portal_token}`);
                  toast({ title: "تم نسخ الرابط 📋" });
                }}
              >
                <Copy className="w-4 h-4" />
                نسخ الرابط 📋
              </Button>
              <a
                href={`https://wa.me/${client.phone ? "966" + client.phone.replace(/^0/, "") : ""}?text=${encodeURIComponent(`أهلاً! برنامجك جاهز على مدربي، افتح الرابط لتشوف تمارينك 💪 ${window.location.origin}/client-portal/${client.portal_token}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1 w-full">
                  <Send className="w-4 h-4" />
                  إرسال واتساب 📲
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 inset-x-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {/* ===== OVERVIEW ===== */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Weight Chart */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-card-foreground">تقدم الوزن</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} name="الوزن (كجم)" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Subscription */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الاشتراك</p>
                    <p className="text-lg font-bold text-card-foreground">{client.subscription_price} ر.س / شهر</p>
                    <p className="text-xs text-muted-foreground">
                      ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                    status === "active" ? "bg-success/10 text-success" :
                    status === "overdue" ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {status === "active" ? "نشط" : status === "overdue" ? "متأخر" : "ينتهي قريباً"}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* ===== PROGRAM ===== */}
          {activeTab === "program" && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-card-foreground">برنامج تضخيم</h3>
                </div>
                <p className="text-sm text-muted-foreground">12 أسبوع • الأسبوع {client.week_number}</p>
              </Card>

              <div className="space-y-3">
                {demoProgramDays.map((day) => (
                  <Card key={day.day} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-card-foreground">
                        اليوم {day.day}: {day.name}
                      </h4>
                      {day.done ? (
                        <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-success-foreground" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-border" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {day.exercises.map((ex, i) => (
                        <p key={i} className={`text-sm ${day.done ? "text-muted-foreground line-through" : "text-secondary-foreground"}`}>
                          • {ex}
                        </p>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ===== PAYMENTS ===== */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <Button className="w-full gap-1">
                <CreditCard className="w-4 h-4" />
                تسجيل دفعة جديدة
              </Button>

              {overdueAmount > 0 && (
                <Card className="p-4 border-destructive/30 bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">مبلغ متأخر</p>
                      <p className="text-2xl font-bold text-destructive">{overdueAmount} ر.س</p>
                    </div>
                    <span className="text-sm px-3 py-1.5 rounded-full font-medium bg-destructive/10 text-destructive">متأخر</span>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                {demoPayments.map((p) => (
                  <Card key={p.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-card-foreground">{p.amount} ر.س</span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.due_date).toLocaleDateString("ar-SA")}
                        </p>
                        {p.paid_date && (
                          <p className="text-xs text-success">
                            مدفوع: {new Date(p.paid_date).toLocaleDateString("ar-SA")}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.status === "paid" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}>
                        {p.status === "paid" ? "مدفوع" : "متأخر"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ===== MEASUREMENTS ===== */}
          {activeTab === "measurements" && (
            <div className="space-y-4">
              {/* Add Form */}
              <Card className="p-4">
                <h3 className="font-bold text-card-foreground mb-3">إضافة قياس جديد</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">الوزن (كجم)</label>
                    <Input type="number" dir="ltr" placeholder="85" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">الدهون %</label>
                    <Input type="number" dir="ltr" placeholder="21" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full mt-3">حفظ</Button>
              </Card>

              {/* Chart */}
              <Card className="p-4">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} name="الوزن" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* History with Trends */}
              <div className="space-y-2">
                {demoMeasurements.slice().reverse().map((m, i, arr) => {
                  const prev = arr[i + 1];
                  const weightTrend = prev ? m.weight - prev.weight : 0;
                  const fatTrend = prev ? m.body_fat - prev.body_fat : 0;

                  return (
                    <Card key={m.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {new Date(m.date).toLocaleDateString("ar-SA")}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-card-foreground">{m.weight} كجم</span>
                            {weightTrend !== 0 && (
                              weightTrend < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">{m.body_fat}%</span>
                            {fatTrend !== 0 && (
                              fatTrend < 0 ? (
                                <TrendingDown className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </TrainerLayout>
  );
};

export default ClientProfile;
