import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const weekDays = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

const demoWeekStatus = [
  { done: true }, { done: true }, { done: true }, { done: true },
  { done: true }, { done: false }, { done: false },
];
const todayIndex = 4;

const PortalHome = () => {
  const navigate = useNavigate();
  const { token } = useParams();

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("portal_token", token!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const todayDate = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  if (!client) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <p className="text-4xl">❌</p>
          <h1 className="text-xl font-bold text-foreground">رابط غير صحيح</h1>
          <p className="text-sm text-muted-foreground">هذا الرابط غير صالح أو منتهي الصلاحية. تواصل مع مدربك للحصول على الرابط الصحيح.</p>
        </div>
      </ClientPortalLayout>
    );
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً {client.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayDate}</p>
        </div>

        <div className="flex items-center gap-2 bg-accent rounded-xl px-4 py-3">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-bold text-accent-foreground">🔥 5 أيام متتالية</span>
        </div>

        <Card className="p-5 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">تمرين اليوم</p>
              <h2 className="text-lg font-bold text-card-foreground">اليوم 3 - صدر وترايسبس</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">لم تبدأ بعد</span>
          </div>

          <div className="text-sm text-muted-foreground mb-4 space-y-1">
            <p>• بنش بريس 4×10 (80 كجم)</p>
            <p>• تفتيح دمبل 3×12 (14 كجم)</p>
            <p>• بوش أب 3×15</p>
            <p>• تراي بوش داون 3×12 (25 كجم)</p>
          </div>

          <Button className="w-full text-base py-6 gap-2" onClick={() => navigate(`/client-portal/${token}/workout`)}>
            <Play className="w-5 h-5" />
            ابدأ التمرين 💪
          </Button>
        </Card>

        <div>
          <h3 className="font-bold text-foreground mb-3">الجدول الأسبوعي</h3>
          <div className="flex justify-between gap-1">
            {weekDays.map((day, i) => {
              const isToday = i === todayIndex;
              const isDone = demoWeekStatus[i]?.done && !isToday;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone ? "bg-primary text-primary-foreground" : isToday ? "border-2 border-primary text-primary animate-pulse" : "bg-secondary text-muted-foreground"}`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "هذا الأسبوع", value: "4/6", sub: "تمارين" },
            { label: "الوزن الحالي", value: "85", sub: "كجم" },
            { label: "أفضل streak", value: "12", sub: "يوم" },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <p className="text-lg font-bold text-card-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalHome;
