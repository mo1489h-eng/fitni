import { useState, useMemo } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, ChevronLeft } from "lucide-react";

const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const CLIENT_COLORS = [
  "bg-primary/20 text-primary",
  "bg-blue-500/20 text-blue-600",
  "bg-purple-500/20 text-purple-600",
  "bg-orange-500/20 text-orange-600",
  "bg-pink-500/20 text-pink-600",
  "bg-teal-500/20 text-teal-600",
  "bg-red-500/20 text-red-600",
  "bg-indigo-500/20 text-indigo-600",
];

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch programs with days to know which days each client trains
  const { data: programDays = [] } = useQuery({
    queryKey: ["all-program-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_days")
        .select("*, programs!inner(trainer_id)")
        .order("day_order");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Map client to their training day indices (0=Sun..6=Sat based on day_order)
  const clientSchedule = useMemo(() => {
    const schedule: Record<string, number[]> = {};
    clients.forEach((client) => {
      if (!client.program_id) return;
      const days = programDays
        .filter((d: any) => d.program_id === client.program_id)
        .map((d: any) => d.day_order % 7);
      schedule[client.id] = days;
    });
    return schedule;
  }, [clients, programDays]);

  // Color map per client
  const clientColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c, i) => {
      map[c.id] = CLIENT_COLORS[i % CLIENT_COLORS.length];
    });
    return map;
  }, [clients]);

  // Calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getClientsForDay = (day: number) => {
    const dayOfWeek = new Date(year, month, day).getDay();
    return clients.filter((c) => clientSchedule[c.id]?.includes(dayOfWeek));
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const selectedClients = selectedDay ? getClientsForDay(selectedDay) : [];

  return (
    <TrainerLayout>
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">التقويم</h1>
          <Button variant="outline" size="sm" onClick={goToday}>اليوم</Button>
        </div>

        <Card className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            <h2 className="text-lg font-bold text-foreground">{MONTHS_AR[month]} {year}</h2>
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_AR.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayClients = getClientsForDay(day);
              const selected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  className={`h-16 rounded-lg border text-sm flex flex-col items-center p-1 transition-colors ${
                    selected ? "border-primary bg-primary/5" :
                    isToday(day) ? "border-primary/50 bg-primary/10" :
                    "border-border hover:border-primary/30"
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday(day) ? "text-primary font-bold" : "text-foreground"}`}>
                    {day}
                  </span>
                  {dayClients.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {dayClients.slice(0, 3).map((c) => (
                        <div key={c.id} className={`w-2 h-2 rounded-full ${clientColorMap[c.id]?.split(" ")[0] || "bg-primary/20"}`} />
                      ))}
                      {dayClients.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayClients.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <Card className="p-4">
            <h3 className="font-bold text-foreground mb-3">
              {selectedDay} {MONTHS_AR[month]} - {selectedClients.length} عميل
            </h3>
            {selectedClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد تمارين مجدولة لهذا اليوم</p>
            ) : (
              <div className="space-y-2">
                {selectedClients.map((c) => (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${clientColorMap[c.id] || "bg-secondary"}`}>
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center text-xs font-bold">
                      {c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs opacity-70">{c.goal}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Legend */}
        {clients.filter(c => clientSchedule[c.id]?.length > 0).length > 0 && (
          <Card className="p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">دليل الألوان</h4>
            <div className="flex flex-wrap gap-2">
              {clients.filter(c => clientSchedule[c.id]?.length > 0).map((c) => (
                <span key={c.id} className={`text-xs px-2 py-1 rounded-full ${clientColorMap[c.id]}`}>
                  {c.name}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
};

export default Calendar;
