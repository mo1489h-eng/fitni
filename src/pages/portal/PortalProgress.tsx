import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Calendar, Dumbbell, Flame, Trophy } from "lucide-react";

const weightData = [
  { week: "أسبوع 1", weight: 95 },
  { week: "أسبوع 2", weight: 93 },
  { week: "أسبوع 3", weight: 91 },
  { week: "أسبوع 4", weight: 90 },
  { week: "أسبوع 5", weight: 88 },
  { week: "أسبوع 6", weight: 87 },
  { week: "أسبوع 7", weight: 86 },
  { week: "أسبوع 8", weight: 85 },
];

const strengthData = [
  { name: "بنش بريس", start: 60, current: 80, unit: "كجم" },
  { name: "سكوات", start: 60, current: 100, unit: "كجم" },
  { name: "ديدلفت", start: 70, current: 110, unit: "كجم" },
  { name: "شولدر بريس", start: 20, current: 35, unit: "كجم" },
];

// Generate attendance calendar (current month)
const generateCalendar = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  // Demo: workout days
  const workoutDays = new Set([1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 16, 17, 19, 20, 22, 23, 24, 26, 27]);
  return { daysInMonth, firstDay, workoutDays, month, year };
};

const PortalProgress = () => {
  const { daysInMonth, firstDay, workoutDays, month, year } = generateCalendar();
  const monthName = new Date(year, month).toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
  const dayNames = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">تقدمي</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Dumbbell, value: "48", label: "إجمالي التمارين", color: "text-primary" },
            { icon: Trophy, value: "110", label: "أفضل وزن (كجم)", color: "text-warning" },
            { icon: Flame, value: "12", label: "أطول streak", color: "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Weight Chart */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">تقدم الوزن</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} name="الوزن (كجم)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Strength Progress */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">تقدم القوة</h3>
          </div>
          <div className="space-y-3">
            {strengthData.map((ex) => {
              const pct = Math.round(((ex.current - ex.start) / ex.start) * 100);
              const barPct = Math.min((ex.current / (ex.start * 2)) * 100, 100);
              return (
                <div key={ex.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-card-foreground">{ex.name}</span>
                    <span className="text-primary font-bold">
                      {ex.current} {ex.unit}
                      <span className="text-xs text-success mr-1">(+{pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${barPct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">بداية: {ex.start} {ex.unit}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Attendance Calendar */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-card-foreground">سجل الحضور</h3>
            <span className="text-xs text-muted-foreground mr-auto">{monthName}</span>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-[10px] text-muted-foreground text-center">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isWorkout = workoutDays.has(day);
              const isToday = day === new Date().getDate();
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-full flex items-center justify-center text-xs font-medium ${
                    isWorkout
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "border-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>يوم تمرين</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border-2 border-primary" />
              <span>اليوم</span>
            </div>
          </div>
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalProgress;
