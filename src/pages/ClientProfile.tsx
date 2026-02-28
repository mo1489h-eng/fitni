import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, CreditCard, ClipboardList,
  Loader2, ArrowLeft, Check, Dumbbell, Calendar, Copy, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

type TabKey = "overview" | "program" | "payments";
const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "program", label: "البرنامج" },
  { key: "payments", label: "المدفوعات" },
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
  const lastWorkoutDays = Math.ceil((Date.now() - new Date(client.last_workout_date).getTime()) / 86400000);
  const daysUntilEnd = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);

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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "آخر تمرين", value: lastWorkoutDays === 0 ? "اليوم" : `${lastWorkoutDays}`, unit: lastWorkoutDays === 0 ? "" : "يوم", icon: Calendar },
              { label: "الاشتراك", value: `${client.subscription_price}`, unit: "ر.س", icon: CreditCard },
              { label: "ينتهي خلال", value: daysUntilEnd < 0 ? "منتهي" : `${daysUntilEnd}`, unit: daysUntilEnd < 0 ? "" : "يوم", icon: Check },
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
          {activeTab === "overview" && (
            <div className="space-y-4">
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

              <Card className="p-4">
                <h3 className="font-bold text-card-foreground mb-2">معلومات العميل</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الجوال</span>
                    <span className="text-card-foreground" dir="ltr">{client.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الهدف</span>
                    <span className="text-card-foreground">{client.goal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ الانضمام</span>
                    <span className="text-card-foreground">{new Date(client.created_at).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "program" && (
            <div className="text-center py-10 text-muted-foreground">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">لم يتم تعيين برنامج بعد</p>
              <p className="text-xs mt-1">سيتم إضافة إدارة البرامج قريباً</p>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">سعر الاشتراك</p>
                    <p className="text-2xl font-bold text-card-foreground">{client.subscription_price} ر.س</p>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                    status === "active" ? "bg-success/10 text-success" :
                    status === "overdue" ? "bg-destructive/10 text-destructive" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {status === "active" ? "نشط" : status === "overdue" ? "منتهي" : "ينتهي قريباً"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}
                </p>
              </Card>
              <div className="text-center py-6 text-muted-foreground">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">سجل المدفوعات التفصيلي سيكون متاحاً قريباً</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TrainerLayout>
  );
};

export default ClientProfile;
