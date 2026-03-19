import { useState, useMemo } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Edit2, MessageCircle,
  CalendarDays, Loader2, Clock, Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const SESSION_TYPES = ["تدريب", "استشارة", "متابعة"];
const DURATIONS = [30, 45, 60, 90];

const CLIENT_COLORS = [
  { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/30" },
  { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-500", border: "border-blue-500/30" },
  { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-500", border: "border-purple-500/30" },
  { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-500", border: "border-orange-500/30" },
  { bg: "bg-pink-500/10", text: "text-pink-400", dot: "bg-pink-500", border: "border-pink-500/30" },
  { bg: "bg-teal-500/10", text: "text-teal-400", dot: "bg-teal-500", border: "border-teal-500/30" },
  { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500", border: "border-red-500/30" },
  { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-500", border: "border-indigo-500/30" },
];

type ViewMode = "monthly" | "weekly" | "daily";

interface Session {
  id: string;
  trainer_id: string;
  client_id: string;
  session_type: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
}

const CalendarPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [viewSession, setViewSession] = useState<Session | null>(null);

  const [formClientId, setFormClientId] = useState("");
  const [formType, setFormType] = useState("تدريب");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("60");
  const [formNotes, setFormNotes] = useState("");

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

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["trainer-sessions", year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
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

  const clientColorMap = useMemo(() => {
    const map: Record<string, typeof CLIENT_COLORS[0]> = {};
    clients.forEach((c, i) => { map[c.id] = CLIENT_COLORS[i % CLIENT_COLORS.length]; });
    return map;
  }, [clients]);

  const clientNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  const clientPhoneMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { map[c.id] = c.phone; });
    return map;
  }, [clients]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getSessionsForDay = (day: number) =>
    sessions.filter((s) => s.session_date === getDateStr(day));

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(todayStr); };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formClientId || !formDate) throw new Error("اختر العميل والتاريخ");
      const { error } = await supabase.from("trainer_sessions").insert({
        trainer_id: user!.id,
        client_id: formClientId,
        session_type: formType,
        session_date: formDate,
        start_time: formTime,
        duration_minutes: Number(formDuration),
        notes: formNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-sessions"] });
      resetForm();
      setShowAddModal(false);
      toast({ title: "تمت إضافة الجلسة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editSession) return;
      const { error } = await supabase.from("trainer_sessions").update({
        client_id: formClientId,
        session_type: formType,
        session_date: formDate,
        start_time: formTime,
        duration_minutes: Number(formDuration),
        notes: formNotes || null,
      }).eq("id", editSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-sessions"] });
      resetForm();
      setEditSession(null);
      setViewSession(null);
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

  const resetForm = () => {
    setFormClientId("");
    setFormType("تدريب");
    setFormDate("");
    setFormTime("09:00");
    setFormDuration("60");
    setFormNotes("");
  };

  const openAdd = (dateStr?: string) => {
    resetForm();
    if (dateStr) setFormDate(dateStr);
    setShowAddModal(true);
  };

  const openEdit = (s: Session) => {
    setFormClientId(s.client_id);
    setFormType(s.session_type);
    setFormDate(s.session_date);
    setFormTime(s.start_time);
    setFormDuration(String(s.duration_minutes));
    setFormNotes(s.notes || "");
    setEditSession(s);
  };

  const sendWhatsApp = (s: Session) => {
    const phone = clientPhoneMap[s.client_id];
    if (!phone) { toast({ title: "لا يوجد رقم هاتف لهذا العميل", variant: "destructive" }); return; }
    const formatted = phone.replace(/^0/, "966");
    const name = clientNameMap[s.client_id] || "";
    const msg = `مرحبا ${name}\nتذكير بجلسة ${s.session_type} بتاريخ ${s.session_date} الساعة ${s.start_time.slice(0, 5)}\nمدة الجلسة: ${s.duration_minutes} دقيقة`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const formatTime = (t: string) => t.slice(0, 5);
  const selectedSessions = selectedDay ? sessions.filter((s) => s.session_date === selectedDay) : [];

  const getWeekDays = () => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const weekDays = getWeekDays();
  const totalSessionsThisMonth = sessions.length;

  return (
    <TrainerLayout>
      <div className="space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-primary" strokeWidth={1.5} />
              التقويم
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{totalSessionsThisMonth} جلسة هذا الشهر</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)] hover:border-primary/40 text-foreground"
            >
              اليوم
            </Button>
            <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              إضافة جلسة
            </Button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1 bg-[hsl(0_0%_4%)] rounded-xl p-1 border border-[hsl(0_0%_10%)]">
          {([["monthly", "شهري"], ["weekly", "أسبوعي"], ["daily", "يومي"]] as [ViewMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 text-sm py-2.5 rounded-lg transition-all duration-200 font-medium ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(0_0%_8%)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ===== MONTHLY VIEW ===== */}
            {viewMode === "monthly" && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
                <div className="flex items-center justify-between mb-5">
                  <Button variant="ghost" size="sm" onClick={nextMonth} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                  <h2 className="text-lg font-bold text-foreground tracking-wide">{MONTHS_AR[month]} {year}</h2>
                  <Button variant="ghost" size="sm" onClick={prevMonth} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS_AR.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`e-${i}`} className="h-20" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = getDateStr(day);
                    const daySessions = getSessionsForDay(day);
                    const selected = selectedDay === dateStr;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(selected ? null : dateStr)}
                        className={`h-20 rounded-lg border text-sm flex flex-col items-center p-1 transition-all duration-200 ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : isToday(day)
                              ? "border-primary/40 bg-primary/5"
                              : "border-[hsl(0_0%_10%)] hover:border-[hsl(0_0%_16%)] hover:bg-[hsl(0_0%_8%)]"
                        }`}
                      >
                        <span className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday(day) ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                        }`}>
                          {day}
                        </span>
                        {daySessions.length > 0 && (
                          <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full">
                            {daySessions.slice(0, 2).map((s) => (
                              <div key={s.id} className={`w-full text-[8px] truncate px-1 rounded ${clientColorMap[s.client_id]?.bg || "bg-primary/10"} ${clientColorMap[s.client_id]?.text || "text-primary"}`}>
                                {clientNameMap[s.client_id]?.split(" ")[0]}
                              </div>
                            ))}
                            {daySessions.length > 2 && (
                              <span className="text-[8px] text-muted-foreground">+{daySessions.length - 2}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== WEEKLY VIEW ===== */}
            {viewMode === "weekly" && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
                <div className="flex items-center justify-between mb-5">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 7);
                    setCurrentDate(d);
                  }} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                  <h2 className="text-sm font-bold text-foreground">
                    {weekDays[0].getDate()} - {weekDays[6].getDate()} {MONTHS_AR[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 7);
                    setCurrentDate(d);
                  }} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="space-y-2">
                  {weekDays.map((wd) => {
                    const dateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`;
                    const daySessions = sessions.filter((s) => s.session_date === dateStr);
                    const isTodayDate = dateStr === todayStr;
                    return (
                      <div key={dateStr} className={`rounded-xl border p-3.5 transition-all duration-200 ${
                        isTodayDate
                          ? "border-primary/40 bg-primary/5"
                          : "border-[hsl(0_0%_10%)] hover:border-[hsl(0_0%_16%)]"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isTodayDate && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            <span className={`text-sm font-bold ${isTodayDate ? "text-primary" : "text-foreground"}`}>
                              {DAYS_AR[wd.getDay()]} {wd.getDate()}
                            </span>
                            {daySessions.length > 0 && (
                              <span className="text-xs text-muted-foreground bg-[hsl(0_0%_10%)] px-2 py-0.5 rounded-full">
                                {daySessions.length} جلسة
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[hsl(0_0%_10%)]" onClick={() => openAdd(dateStr)}>
                            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </Button>
                        </div>
                        {daySessions.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">لا توجد جلسات</p>
                        ) : (
                          <div className="space-y-1.5">
                            {daySessions.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => setViewSession(s)}
                                className={`w-full text-right flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 border ${clientColorMap[s.client_id]?.bg || "bg-primary/10"} ${clientColorMap[s.client_id]?.border || "border-primary/20"} hover:scale-[1.01]`}
                              >
                                <div className={`w-1.5 h-8 rounded-full ${clientColorMap[s.client_id]?.dot || "bg-primary"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold ${clientColorMap[s.client_id]?.text || "text-primary"}`}>
                                    {clientNameMap[s.client_id]}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{s.session_type} · {formatTime(s.start_time)} · {s.duration_minutes} د</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== DAILY VIEW ===== */}
            {viewMode === "daily" && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
                <div className="flex items-center justify-between mb-5">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 1);
                    setCurrentDate(d);
                  }} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                  <h2 className="text-sm font-bold text-foreground">
                    {DAYS_AR[currentDate.getDay()]} {currentDate.getDate()} {MONTHS_AR[currentDate.getMonth()]}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 1);
                    setCurrentDate(d);
                  }} className="hover:bg-[hsl(0_0%_10%)]">
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>

                {(() => {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
                  const daySessions = sessions.filter((s) => s.session_date === dateStr);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                          {daySessions.length} جلسة
                        </span>
                        <Button size="sm" variant="outline" onClick={() => openAdd(dateStr)} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] hover:border-primary/40 gap-1">
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                          إضافة
                        </Button>
                      </div>
                      {daySessions.length === 0 ? (
                        <div className="text-center py-16">
                          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" strokeWidth={1.5} />
                          <p className="text-sm text-muted-foreground">لا توجد جلسات في هذا اليوم</p>
                          <Button size="sm" className="mt-4 gap-1.5" onClick={() => openAdd(dateStr)}>
                            <Plus className="w-4 h-4" strokeWidth={1.5} />
                            إضافة جلسة
                          </Button>
                        </div>
                      ) : daySessions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setViewSession(s)}
                          className={`w-full text-right flex items-center gap-3.5 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${clientColorMap[s.client_id]?.bg || "bg-primary/10"} ${clientColorMap[s.client_id]?.border || "border-primary/20"}`}
                        >
                          <div className={`w-1.5 h-14 rounded-full ${clientColorMap[s.client_id]?.dot || "bg-primary"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold ${clientColorMap[s.client_id]?.text || "text-primary"}`}>
                              {clientNameMap[s.client_id]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.session_type}</p>
                            {s.notes && <p className="text-xs text-muted-foreground/60 mt-1 truncate">{s.notes}</p>}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground tabular-nums">{formatTime(s.start_time)}</p>
                            <p className="text-xs text-muted-foreground">{s.duration_minutes} دقيقة</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Selected Day Detail (monthly) */}
            {viewMode === "monthly" && selectedDay && (
              <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground">
                    {parseInt(selectedDay.split("-")[2])} {MONTHS_AR[parseInt(selectedDay.split("-")[1]) - 1]}
                    <span className="text-sm font-normal text-muted-foreground mr-2">({selectedSessions.length} جلسة)</span>
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => openAdd(selectedDay)} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] hover:border-primary/40 gap-1">
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                    إضافة
                  </Button>
                </div>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد جلسات مجدولة</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setViewSession(s)}
                        className={`w-full text-right flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 hover:scale-[1.01] ${clientColorMap[s.client_id]?.bg || "bg-primary/10"} ${clientColorMap[s.client_id]?.border || "border-primary/20"}`}
                      >
                        <div className={`w-1.5 h-10 rounded-full ${clientColorMap[s.client_id]?.dot || "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${clientColorMap[s.client_id]?.text || "text-primary"}`}>
                            {clientNameMap[s.client_id]}
                          </p>
                          <p className="text-xs text-muted-foreground">{s.session_type} · {formatTime(s.start_time)} · {s.duration_minutes} دقيقة</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== ADD/EDIT SESSION MODAL ===== */}
        <Dialog open={showAddModal || !!editSession} onOpenChange={(open) => {
          if (!open) { setShowAddModal(false); setEditSession(null); resetForm(); }
        }}>
          <DialogContent className="max-w-md bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <CalendarDays className="w-5 h-5 text-primary" strokeWidth={1.5} />
                {editSession ? "تعديل الجلسة" : "إضافة جلسة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4" dir="rtl">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">العميل</label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">نوع الجلسة</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">التاريخ</label>
                  <Input type="date" dir="ltr" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">الوقت</label>
                  <Input type="time" dir="ltr" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">المدة</label>
                <Select value={formDuration} onValueChange={setFormDuration}>
                  <SelectTrigger className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} دقيقة</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">ملاحظات</label>
                <Textarea placeholder="ملاحظات اختيارية..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)]" />
              </div>
              <Button
                className="w-full"
                disabled={!formClientId || !formDate || createMutation.isPending || updateMutation.isPending}
                onClick={() => editSession ? updateMutation.mutate() : createMutation.mutate()}
              >
                {(createMutation.isPending || updateMutation.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : editSession ? "تحديث الجلسة" : "حفظ الجلسة"
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== VIEW SESSION MODAL ===== */}
        <Dialog open={!!viewSession} onOpenChange={(open) => { if (!open) setViewSession(null); }}>
          <DialogContent className="max-w-sm bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
            <DialogHeader>
              <DialogTitle className="text-foreground">تفاصيل الجلسة</DialogTitle>
            </DialogHeader>
            {viewSession && (
              <div className="space-y-4" dir="rtl">
                <div className={`p-4 rounded-xl border ${clientColorMap[viewSession.client_id]?.bg || "bg-primary/10"} ${clientColorMap[viewSession.client_id]?.border || "border-primary/20"}`}>
                  <p className={`text-lg font-bold ${clientColorMap[viewSession.client_id]?.text || "text-primary"}`}>
                    {clientNameMap[viewSession.client_id]}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{viewSession.session_type}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[hsl(0_0%_4%)] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                    <p className="text-muted-foreground text-xs">التاريخ</p>
                    <p className="font-bold text-foreground mt-0.5">{viewSession.session_date}</p>
                  </div>
                  <div className="bg-[hsl(0_0%_4%)] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                    <p className="text-muted-foreground text-xs">الوقت</p>
                    <p className="font-bold text-foreground mt-0.5 tabular-nums">{formatTime(viewSession.start_time)}</p>
                  </div>
                  <div className="bg-[hsl(0_0%_4%)] rounded-xl p-3 border border-[hsl(0_0%_10%)] col-span-2">
                    <p className="text-muted-foreground text-xs">المدة</p>
                    <p className="font-bold text-foreground mt-0.5">{viewSession.duration_minutes} دقيقة</p>
                  </div>
                </div>
                {viewSession.notes && (
                  <div className="bg-[hsl(0_0%_4%)] rounded-xl p-3 border border-[hsl(0_0%_10%)]">
                    <p className="text-muted-foreground text-xs mb-1">ملاحظات</p>
                    <p className="text-sm text-foreground">{viewSession.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] hover:border-primary/40" onClick={() => openEdit(viewSession)}>
                    <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_10%)] hover:border-primary/40 text-primary" onClick={() => sendWhatsApp(viewSession)}>
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    تذكير واتساب
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(viewSession.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  حذف الجلسة
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TrainerLayout>
  );
};

export default CalendarPage;
