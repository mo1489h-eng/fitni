import { useState, useMemo, useCallback, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronLeft, Plus, CalendarDays, Loader2,
  Search, CalendarClock,
} from "lucide-react";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarWeekGrid from "@/components/calendar/CalendarWeekGrid";
import CalendarDayTimeline from "@/components/calendar/CalendarDayTimeline";
import SessionSlidePanel from "@/components/calendar/SessionSlidePanel";
import SessionDetailPanel from "@/components/calendar/SessionDetailPanel";
import {
  ViewMode, Session, Client, MONTHS_AR, DAYS_AR,
  getDateStr, getWeekDays, getSessionTypeStyle,
} from "@/components/calendar/calendar-utils";

const CalendarPage = () => {
  usePageTitle("التقويم");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Panel states
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [viewSession, setViewSession] = useState<Session | null>(null);
  const [prefillDate, setPrefillDate] = useState<string>("");
  const [prefillTime, setPrefillTime] = useState<string>("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = getDateStr(new Date());

  // ─── DATA QUERIES ───
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, phone, email").order("name");
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  // Fetch sessions for a wider range (current month +/- 1 month for weekly view edges)
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["trainer-sessions", year, month],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 2, 0).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("trainer_sessions")
        .select("*")
        .gte("session_date", startDate)
        .lte("session_date", endDate)
        .order("start_time");
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!user,
  });

  // ─── MUTATIONS ───
  const createMutation = useMutation({
    mutationFn: async (data: {
      client_id: string;
      session_type: string;
      session_date: string;
      start_time: string;
      duration_minutes: number;
      notes: string | null;
    }) => {
      const { error } = await supabase.from("trainer_sessions").insert({
        trainer_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-sessions"] });
      setShowAddPanel(false);
      toast({ title: "تمت إضافة الجلسة بنجاح" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      client_id: string;
      session_type: string;
      session_date: string;
      start_time: string;
      duration_minutes: number;
      notes: string | null;
    }) => {
      if (!editSession) return;
      const { error } = await supabase.from("trainer_sessions").update(data).eq("id", editSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-sessions"] });
      setEditSession(null);
      setShowAddPanel(false);
      toast({ title: "تم تحديث الجلسة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainer_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-sessions"] });
      setViewSession(null);
      toast({ title: "تم حذف الجلسة" });
    },
  });

  // ─── NAVIGATION ───
  const goToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDay(todayStr);
  }, [todayStr]);

  const navigateBack = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === "monthly") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "weekly") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  const navigateForward = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === "monthly") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "weekly") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }, [currentDate, viewMode]);

  // ─── HANDLERS ───
  const openAddPanel = useCallback((dateStr?: string, time?: string) => {
    setPrefillDate(dateStr || "");
    setPrefillTime(time || "09:00");
    setEditSession(null);
    setShowAddPanel(true);
  }, []);

  const openEditPanel = useCallback((session: Session) => {
    setEditSession(session);
    setViewSession(null);
    setShowAddPanel(true);
  }, []);

  const handleSaveSession = useCallback(async (data: {
    client_id: string;
    session_type: string;
    session_date: string;
    start_time: string;
    duration_minutes: number;
    notes: string | null;
  }) => {
    if (editSession) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  }, [editSession, createMutation, updateMutation]);

  const sendWhatsApp = useCallback((s: Session) => {
    const client = clients.find((c) => c.id === s.client_id);
    if (!client?.phone) {
      toast({ title: "لا يوجد رقم هاتف لهذا العميل", variant: "destructive" });
      return;
    }
    const formatted = client.phone.replace(/^0/, "966");
    const msg = `مرحبا ${client.name}\nتذكير بجلسة ${s.session_type} بتاريخ ${s.session_date} الساعة ${s.start_time.slice(0, 5)}\nمدة الجلسة: ${s.duration_minutes} دقيقة`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
  }, [clients, toast]);

  // ─── KEYBOARD SHORTCUTS ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showAddPanel || viewSession) {
        if (e.key === "Escape") {
          setShowAddPanel(false);
          setEditSession(null);
          setViewSession(null);
        }
        return;
      }
      switch (e.key.toLowerCase()) {
        case "n": openAddPanel(); break;
        case "t": goToday(); break;
        case "m": setViewMode("monthly"); break;
        case "w": setViewMode("weekly"); break;
        case "d": setViewMode("daily"); break;
        case "arrowleft": navigateForward(); break;
        case "arrowright": navigateBack(); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showAddPanel, viewSession, openAddPanel, goToday, navigateBack, navigateForward]);

  // ─── COMPUTED ───
  const weekDays = getWeekDays(currentDate);
  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.session_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.session_date);
    return d >= weekDays[0] && d <= weekDays[6];
  });
  const upcomingSessions = sessions.filter((s) => s.session_date >= todayStr);

  const getHeaderTitle = () => {
    if (viewMode === "monthly") return `${MONTHS_AR[month]} ${year}`;
    if (viewMode === "weekly") {
      return `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS_AR[weekDays[0].getMonth()]}`;
    }
    return `${DAYS_AR[currentDate.getDay()]}، ${currentDate.getDate()} ${MONTHS_AR[month]} ${year}`;
  };

  return (
    <TrainerLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]" dir="rtl">
        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between px-1 py-3 shrink-0">
          {/* Right: Title + Nav */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{getHeaderTitle()}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={navigateBack}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={navigateForward}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <button
              onClick={goToday}
              className="text-xs font-medium text-muted-foreground hover:text-primary px-2.5 py-1 rounded-md hover:bg-primary/5 transition-colors"
            >
              اليوم
            </button>
          </div>

          {/* Left: View switcher + Add */}
          <div className="flex items-center gap-3">
            {/* View pills */}
            <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5 border border-border">
              {([["monthly", "شهري"], ["weekly", "أسبوعي"], ["daily", "يومي"]] as [ViewMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`text-xs py-1.5 px-3 rounded-md transition-all duration-200 font-medium ${
                    viewMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button size="sm" onClick={() => openAddPanel()} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              إضافة جلسة
            </Button>
          </div>
        </div>

        {/* ═══ CALENDAR BODY ═══ */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {viewMode === "monthly" && (
              <CalendarMonthGrid
                year={year}
                month={month}
                sessions={sessions}
                clients={clients}
                selectedDay={selectedDay}
                onSelectDay={(d) => setSelectedDay(selectedDay === d ? null : d)}
                onAddSession={(d) => openAddPanel(d)}
              />
            )}

            {viewMode === "weekly" && (
              <CalendarWeekGrid
                currentDate={currentDate}
                sessions={sessions}
                clients={clients}
                onClickSession={(s) => setViewSession(s)}
                onClickSlot={(d, t) => openAddPanel(d, t)}
              />
            )}

            {viewMode === "daily" && (
              <CalendarDayTimeline
                currentDate={currentDate}
                sessions={sessions}
                clients={clients}
                onClickSession={(s) => setViewSession(s)}
                onClickSlot={(d, t) => openAddPanel(d, t)}
              />
            )}
          </div>
        )}

        {/* ═══ MINI STATS BAR ═══ */}
        <div className="flex items-center gap-6 px-1 py-2.5 border-t border-border shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">هذا الشهر:</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{thisMonthSessions.length} جلسة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">هذا الأسبوع:</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{thisWeekSessions.length} جلسة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">القادمة:</span>
            <span className="text-xs font-bold text-foreground tabular-nums">{upcomingSessions.length} جلسة</span>
          </div>
        </div>

        {/* ═══ SELECTED DAY DETAIL (Monthly only) ═══ */}
        {viewMode === "monthly" && selectedDay && (() => {
          const daySessions = sessions.filter((s) => s.session_date === selectedDay);
          const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
          return (
            <div className="border-t border-border p-4 shrink-0 max-h-[200px] overflow-y-auto bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">
                  {parseInt(selectedDay.split("-")[2])} {MONTHS_AR[parseInt(selectedDay.split("-")[1]) - 1]}
                  <span className="font-normal text-muted-foreground mr-2">({daySessions.length} جلسة)</span>
                </h3>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => openAddPanel(selectedDay)}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  إضافة
                </Button>
              </div>
              {daySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد جلسات</p>
              ) : (
                <div className="space-y-1.5">
                  {daySessions.map((s) => {
                    const style = getSessionTypeStyle(s.session_type);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setViewSession(s)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 transition-all text-right"
                        style={{ backgroundColor: style.bg }}
                      >
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: style.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold" style={{ color: style.text }}>
                            {clientMap[s.client_id]}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.session_type} · {s.start_time.slice(0, 5)} · {s.duration_minutes} د
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ PANELS ═══ */}
        <SessionSlidePanel
          open={showAddPanel}
          onClose={() => { setShowAddPanel(false); setEditSession(null); }}
          clients={clients}
          sessions={sessions}
          editSession={editSession}
          prefillDate={prefillDate}
          prefillTime={prefillTime}
          onSave={handleSaveSession}
          saving={createMutation.isPending || updateMutation.isPending}
        />

        {viewSession && !showAddPanel && (
          <SessionDetailPanel
            session={viewSession}
            clients={clients}
            onClose={() => setViewSession(null)}
            onEdit={openEditPanel}
            onDelete={(id) => deleteMutation.mutate(id)}
            onWhatsApp={sendWhatsApp}
            deleting={deleteMutation.isPending}
          />
        )}
      </div>
    </TrainerLayout>
  );
};

export default CalendarPage;
