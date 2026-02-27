import { useNavigate } from "react-router-dom";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Play } from "lucide-react";

const weekDays = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

const demoWeekStatus = [
  { done: true },  // سبت
  { done: true },  // أحد
  { done: true },  // اثنين
  { done: true },  // ثلاثاء
  { done: true },  // أربعاء - today (index 4 as example)
  { done: false }, // خميس
  { done: false }, // جمعة
];

const todayIndex = 4; // أربعاء for demo

const PortalHome = () => {
  const navigate = useNavigate();
  const todayDate = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً محمد 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayDate}</p>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2 bg-accent rounded-xl px-4 py-3">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-bold text-accent-foreground">🔥 5 أيام متتالية</span>
        </div>

        {/* Today's Session */}
        <Card className="p-5 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">تمرين اليوم</p>
              <h2 className="text-lg font-bold text-card-foreground">اليوم 3 - صدر وترايسبس</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">
              لم تبدأ بعد
            </span>
          </div>

          <div className="text-sm text-muted-foreground mb-4 space-y-1">
            <p>• بنش بريس 4×10 (80 كجم)</p>
            <p>• تفتيح دمبل 3×12 (14 كجم)</p>
            <p>• بوش أب 3×15</p>
            <p>• تراي بوش داون 3×12 (25 كجم)</p>
          </div>

          <Button
            className="w-full text-base py-6 gap-2"
            onClick={() => navigate("/client-portal/workout")}
          >
            <Play className="w-5 h-5" />
            ابدأ التمرين 💪
          </Button>
        </Card>

        {/* Weekly Schedule */}
        <div>
          <h3 className="font-bold text-foreground mb-3">الجدول الأسبوعي</h3>
          <div className="flex justify-between gap-1">
            {weekDays.map((day, i) => {
              const isToday = i === todayIndex;
              const isDone = demoWeekStatus[i]?.done && !isToday;
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isToday
                        ? "border-2 border-primary text-primary animate-pulse"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
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
