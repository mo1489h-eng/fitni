import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockProgramDays, mockExercises, mockMeasurements } from "@/lib/mockData";
import { Dumbbell, Check, TrendingDown, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

const ClientPortal = () => {
  const [selectedDay, setSelectedDay] = useState(mockProgramDays[0]?.id || "");
  const days = mockProgramDays;
  const currentDay = days.find((d) => d.id === selectedDay);
  const exercises = mockExercises.filter((e) => e.day_id === selectedDay);
  const [logged, setLogged] = useState<Record<string, boolean>>({});

  const chartData = mockMeasurements.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: m.weight,
  }));

  const todayIndex = new Date().getDay();
  const todayDay = days[todayIndex % days.length];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-primary-foreground" />
          <span className="font-bold text-lg text-primary-foreground">تمريني</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 animate-fade-in">
        <Tabs defaultValue="today" dir="rtl">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="today">اليوم</TabsTrigger>
            <TabsTrigger value="schedule">الجدول</TabsTrigger>
            <TabsTrigger value="progress">التقدم</TabsTrigger>
          </TabsList>

          {/* Today's Workout */}
          <TabsContent value="today" className="space-y-4 mt-4">
            {todayDay && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    اليوم {todayDay.day_number}: {todayDay.name}
                  </h2>
                </div>
                {mockExercises
                  .filter((e) => e.day_id === todayDay.id)
                  .map((ex) => (
                    <Card key={ex.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-card-foreground">{ex.name}</h3>
                        {logged[ex.id] && (
                          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">تم ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        المطلوب: {ex.sets} × {ex.reps}
                        {ex.target_weight > 0 && ` • ${ex.target_weight} كجم`}
                      </p>
                      {!logged[ex.id] && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">المجموعات</label>
                              <Input type="number" defaultValue={ex.sets} dir="ltr" className="text-center" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">التكرارات</label>
                              <Input type="number" defaultValue={ex.reps} dir="ltr" className="text-center" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">الوزن</label>
                              <Input type="number" defaultValue={ex.target_weight} dir="ltr" className="text-center" />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setLogged((prev) => ({ ...prev, [ex.id]: true }))}
                          >
                            <Check className="w-4 h-4 ml-1" />
                            تسجيل
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
              </>
            )}
          </TabsContent>

          {/* Weekly Schedule */}
          <TabsContent value="schedule" className="space-y-3 mt-4">
            <h2 className="text-xl font-bold text-foreground">الجدول الأسبوعي</h2>
            {days.map((day) => {
              const dayExercises = mockExercises.filter((e) => e.day_id === day.id);
              return (
                <Card key={day.id} className="p-4">
                  <h3 className="font-bold text-card-foreground mb-1">
                    اليوم {day.day_number}: {day.name}
                  </h3>
                  <div className="space-y-1">
                    {dayExercises.map((ex) => (
                      <p key={ex.id} className="text-sm text-muted-foreground">
                        • {ex.name} — {ex.sets}×{ex.reps}
                        {ex.target_weight > 0 && ` (${ex.target_weight} كجم)`}
                      </p>
                    ))}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* Progress */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">تقدم الوزن</h2>
            </div>
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} name="الوزن" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-4">
              <h3 className="font-bold text-card-foreground mb-3">سجل القياسات</h3>
              {mockMeasurements.slice().reverse().map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {new Date(m.date).toLocaleDateString("ar-SA")}
                  </span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-foreground">{m.weight} كجم</span>
                    <span className="text-muted-foreground">{m.body_fat}%</span>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientPortal;
