import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, ArrowLeft, Timer, Play, Dumbbell, Trophy, Flame, Moon, Target,
  X, CheckCircle, Share2, ChevronLeft, Loader2, MessageSquare, Gauge,
  TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";

interface ExerciseData {
  id: string; name: string; sets: number; reps: number; weight: number;
  video_url: string | null; exercise_order: number;
  rest_seconds: number; tempo: string | null; rpe: number | null;
  notes: string | null; is_warmup: boolean; superset_group: string | null;
}
interface ProgramDay {
  id: string; day_name: string; day_order: number; exercises: ExerciseData[];
}
interface ProgramData {
  id: string; name: string; weeks: number; days: ProgramDay[];
}

interface SetLog {
  exerciseIdx: number;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  notes: string;
}

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const PortalWorkout = () => {
  const navigate = useNavigate();
  const { token } = usePortalToken();
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [actualWeight, setActualWeight] = useState("");
  const [actualReps, setActualReps] = useState("");
  const [actualRpe, setActualRpe] = useState("");
  const [setNotes, setSetNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(60);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const { data: clientData } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  const { data: program, isLoading } = useQuery({
    queryKey: ["portal-program", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portal_program", { p_token: token! });
      if (error) { console.error("get_portal_program error:", error); return null; }
      if (!data) return null;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        id: parsed.id,
        name: parsed.name,
        weeks: parsed.weeks,
        days: (parsed.days || []).map((d: any) => ({
          id: d.id,
          day_name: d.day_name,
          day_order: d.day_order,
          exercises: (d.exercises || []) as ExerciseData[],
        })),
      } as ProgramData;
    },
    enabled: !!token,
  });

  const portalQueryClient = useQueryClient();

  // Real-time sync: program updates from trainer
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel('portal-program-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'program_exercises' }, () => {
        portalQueryClient.invalidateQueries({ queryKey: ["portal-program", token] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'program_days' }, () => {
        portalQueryClient.invalidateQueries({ queryKey: ["portal-program", token] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, portalQueryClient]);

  const todayIndex = new Date().getDay();
  const weekNumber = clientData?.week_number || 1;

  const activeDay = useMemo(() => {
    if (!program?.days) return null;
    if (activeDayId) return program.days.find(d => d.id === activeDayId) || null;
    const todayName = WEEKDAYS[todayIndex];
    return program.days.find(d => d.day_name.includes(todayName)) || program.days[0] || null;
  }, [program, activeDayId, todayIndex]);

  const activeExercises = useMemo(() => {
    if (!activeDay) return [];
    return activeDay.exercises.filter(e => !e.is_warmup);
  }, [activeDay]);
  const warmupExercises = useMemo(() => activeDay?.exercises.filter(e => e.is_warmup) || [], [activeDay]);
  
  const ex = activeExercises[currentExIdx];
  const isLastSet = currentSet >= (ex?.sets || 0);
  const isLastExercise = currentExIdx >= activeExercises.length - 1;

  useEffect(() => {
    if (!resting) return;
    if (restTime <= 0) {
      setResting(false); setRestTime(ex?.rest_seconds || 60);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    const t = setTimeout(() => setRestTime(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restTime, ex?.rest_seconds]);

  const startWorkout = (dayId: string) => {
    setActiveDayId(dayId); setWorkoutStarted(true); setCurrentExIdx(0);
    setCurrentSet(1); setCompleted(false); setTotalSets(0); setTotalVolume(0);
    setStartTime(Date.now()); setActualWeight(""); setActualReps("");
    setActualRpe(""); setSetNotes(""); setSetLogs([]);
  };

  const handleCompleteSet = useCallback(() => {
    const w = Number(actualWeight) || ex?.weight || 0;
    const r = Number(actualReps) || ex?.reps || 0;
    const rpe = actualRpe ? Number(actualRpe) : null;
    
    setSetLogs(prev => [...prev, {
      exerciseIdx: currentExIdx,
      setNumber: currentSet,
      reps: r,
      weight: w,
      rpe,
      notes: setNotes,
    }]);
    
    setTotalVolume(v => v + w * r);
    setTotalSets(s => s + 1);
    
    if (isLastSet && isLastExercise) { setCompleted(true); return; }
    if (isLastSet) {
      setCurrentExIdx(i => i + 1); setCurrentSet(1);
      setActualWeight(""); setActualReps(""); setActualRpe(""); setSetNotes(""); setShowNotes(false);
    } else {
      setCurrentSet(s => s + 1);
      setResting(true); setRestTime(ex?.rest_seconds || 60);
      setActualWeight(""); setActualReps(""); setActualRpe(""); setSetNotes(""); setShowNotes(false);
    }
  }, [isLastSet, isLastExercise, actualWeight, actualReps, actualRpe, setNotes, ex, currentExIdx, currentSet]);

  const skipRest = () => { setResting(false); setRestTime(ex?.rest_seconds || 60); };

  // Get previous set data for current exercise
  const prevSetData = useMemo(() => {
    if (!ex) return null;
    const lastLog = [...setLogs].reverse().find(l => l.exerciseIdx === currentExIdx);
    return lastLog || null;
  }, [setLogs, currentExIdx, ex]);

  // COMPLETION SCREEN
  if (workoutStarted && completed) {
    const mins = Math.round((Date.now() - startTime) / 60000);
    const avgRpe = setLogs.filter(l => l.rpe !== null).length > 0
      ? (setLogs.filter(l => l.rpe !== null).reduce((s, l) => s + (l.rpe || 0), 0) / setLogs.filter(l => l.rpe !== null).length).toFixed(1)
      : null;
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[75vh] text-center animate-fade-in space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">أحسنت!</h1>
            <p className="text-sm text-[hsl(0_0%_45%)]">أكملت تمرين {activeDay?.day_name}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {[
              { icon: Dumbbell, val: activeExercises.length, label: "تمارين" },
              { icon: Trophy, val: totalSets, label: "سيت" },
              { icon: Timer, val: mins || 1, label: "دقيقة" },
            ].map((s, i) => (
              <div key={i} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-3 text-center">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-xl font-bold text-white">{s.val}</p>
                <p className="text-[10px] text-[hsl(0_0%_40%)]">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {totalVolume > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
                <Flame className="w-4 h-4 text-primary mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-lg font-bold text-primary">{totalVolume.toLocaleString()}</p>
                <p className="text-[10px] text-[hsl(0_0%_40%)]">كجم مرفوع</p>
              </div>
            )}
            {avgRpe && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                <Gauge className="w-4 h-4 text-amber-400 mx-auto mb-1" strokeWidth={1.5} />
                <p className="text-lg font-bold text-amber-400">{avgRpe}</p>
                <p className="text-[10px] text-[hsl(0_0%_40%)]">متوسط RPE</p>
              </div>
            )}
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Button variant="outline" className="w-full h-11 gap-2 border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)]">
              <Share2 className="w-4 h-4" strokeWidth={1.5} /> مشاركة
            </Button>
            <Button className="w-full h-12 text-base" onClick={() => { setWorkoutStarted(false); setCompleted(false); navigate("/portal"); }}>
              العودة للرئيسية
            </Button>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  // REST TIMER
  if (workoutStarted && resting && ex) {
    const maxRest = ex.rest_seconds || 60;
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference * (1 - restTime / maxRest);
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[75vh] text-center animate-fade-in space-y-6">
          <p className="text-sm text-[hsl(0_0%_40%)]">وقت الراحة</p>
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(0 0% 10%)" strokeWidth="4" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(142 76% 36%)" strokeWidth="4"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-linear" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white tabular-nums">{restTime}</span>
            </div>
          </div>
          <p className="text-xs text-[hsl(0_0%_35%)]">{ex.name} — السيت التالي: {currentSet} من {ex.sets}</p>
          <Button variant="ghost" onClick={skipRest} className="text-[hsl(0_0%_40%)] hover:text-white">
            تخطي الراحة
          </Button>
        </div>
      </ClientPortalLayout>
    );
  }

  // ACTIVE WORKOUT
  if (workoutStarted && ex) {
    const exerciseProgress = ((currentExIdx) / activeExercises.length) * 100;
    const completedSetsForEx = setLogs.filter(l => l.exerciseIdx === currentExIdx);
    
    return (
      <div className="min-h-screen bg-[hsl(0_0%_2%)] flex flex-col" dir="rtl">
        {/* Top bar */}
        <div className="sticky top-0 z-50 bg-[hsl(0_0%_3%)] border-b border-[hsl(0_0%_8%)] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => setWorkoutStarted(false)} className="text-[hsl(0_0%_40%)] hover:text-white">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-white">{activeDay?.day_name}</span>
            <span className="text-xs text-[hsl(0_0%_40%)] tabular-nums">
              {Math.round((Date.now() - startTime) / 60000)}:00
            </span>
          </div>
          <div className="max-w-lg mx-auto mt-2">
            <Progress value={exerciseProgress} className="h-1" />
          </div>
        </div>

        <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-5">
          {/* Exercise info */}
          <div className="text-center pt-4">
            <p className="text-xs text-[hsl(0_0%_40%)] mb-1">تمرين {currentExIdx + 1} من {activeExercises.length}</p>
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Target className="w-5 h-5 text-primary" strokeWidth={1.5} />
              {ex.name}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-1 text-sm text-[hsl(0_0%_35%)]">
              <span>{ex.sets} سيت × {ex.reps} تكرار{ex.weight > 0 && ` × ${ex.weight} كجم`}</span>
            </div>
            {/* Tempo & RPE target */}
            <div className="flex items-center justify-center gap-3 mt-1">
              {ex.tempo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[hsl(0_0%_8%)] text-[hsl(0_0%_50%)]">
                  Tempo: {ex.tempo}
                </span>
              )}
              {ex.rpe && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  RPE {ex.rpe}
                </span>
              )}
              {ex.rest_seconds > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[hsl(0_0%_8%)] text-[hsl(0_0%_50%)]">
                  راحة {ex.rest_seconds}ث
                </span>
              )}
            </div>
            {ex.notes && (
              <p className="text-[11px] text-[hsl(0_0%_30%)] mt-2 bg-[hsl(0_0%_6%)] rounded-lg p-2">
                {ex.notes}
              </p>
            )}
          </div>

          {/* Completed sets for this exercise */}
          {completedSetsForEx.length > 0 && (
            <div className="space-y-1">
              {completedSetsForEx.map((log, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-[hsl(0_0%_6%)] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    <span className="text-[hsl(0_0%_50%)]">سيت {log.setNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[hsl(0_0%_40%)]">
                    <span>{log.weight} كجم × {log.reps}</span>
                    {log.rpe && <span className="text-amber-400">RPE {log.rpe}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Set tracker */}
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5">
            <h3 className="font-bold text-white text-center mb-4">السيت {currentSet} من {ex.sets}</h3>
            {prevSetData && (
              <p className="text-xs text-[hsl(0_0%_30%)] text-center mb-3 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
                السيت السابق: {prevSetData.weight} كجم × {prevSetData.reps}
                {prevSetData.rpe && ` @ RPE ${prevSetData.rpe}`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-[hsl(0_0%_40%)] block mb-1.5">التكرارات</label>
                <Input type="number" dir="ltr" placeholder={String(ex.reps)} value={actualReps}
                  onChange={e => setActualReps(e.target.value)}
                  className="text-center text-xl font-bold h-14 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_12%)] text-white" />
              </div>
              <div>
                <label className="text-xs text-[hsl(0_0%_40%)] block mb-1.5">الوزن (كجم)</label>
                <Input type="number" dir="ltr" placeholder={String(ex.weight || "—")} value={actualWeight}
                  onChange={e => setActualWeight(e.target.value)}
                  className="text-center text-xl font-bold h-14 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_12%)] text-white" />
              </div>
            </div>

            {/* RPE slider */}
            <div className="mb-3">
              <label className="text-xs text-[hsl(0_0%_40%)] block mb-1.5 flex items-center gap-1">
                <Gauge className="w-3 h-3" strokeWidth={1.5} /> RPE (صعوبة الجهد)
              </label>
              <div className="flex gap-1.5">
                {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                  <button key={v} onClick={() => setActualRpe(String(v))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      actualRpe === String(v)
                        ? v >= 9 ? "bg-destructive/20 text-destructive border border-destructive/30"
                          : v >= 8 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-primary/20 text-primary border border-primary/30"
                        : "bg-[hsl(0_0%_8%)] text-[hsl(0_0%_35%)] border border-transparent"
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes toggle */}
            <button onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 text-xs text-[hsl(0_0%_35%)] hover:text-[hsl(0_0%_60%)] mb-3 transition-colors">
              <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
              {showNotes ? "إخفاء الملاحظات" : "إضافة ملاحظة"}
            </button>
            {showNotes && (
              <Textarea placeholder="ملاحظات على هذا السيت..." value={setNotes}
                onChange={e => setSetNotes(e.target.value)} rows={2}
                className="mb-3 bg-[hsl(0_0%_4%)] border-[hsl(0_0%_12%)] text-white text-xs" />
            )}

            <Button className="w-full h-14 text-base gap-2" onClick={handleCompleteSet}>
              <Check className="w-5 h-5" strokeWidth={1.5} />
              {isLastSet && isLastExercise ? "إنهاء التمرين" : "أكمل السيت"}
            </Button>
          </div>

          {/* Set dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: ex.sets }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${
                i < currentSet - 1 ? "bg-primary" : i === currentSet - 1 ? "bg-primary/50 ring-2 ring-primary/30" : "bg-[hsl(0_0%_12%)]"
              }`} />
            ))}
          </div>

          {/* Next exercise hint */}
          {!isLastExercise && (
            <div className="flex items-center gap-2 text-xs text-[hsl(0_0%_30%)]">
              <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
              <span>التالي: {activeExercises[currentExIdx + 1]?.name}</span>
            </div>
          )}
        </main>
      </div>
    );
  }

  // PROGRAM OVERVIEW
  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  if (!program) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Dumbbell className="w-14 h-14 text-[hsl(0_0%_20%)] mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">لا يوجد برنامج بعد</h2>
          <p className="text-sm text-[hsl(0_0%_40%)]">مدربك لم يخصص لك برنامج تدريبي حتى الآن</p>
        </div>
      </ClientPortalLayout>
    );
  }

  const todayDayName = WEEKDAYS[todayIndex];
  const weekProgress = program.weeks > 0 ? Math.min((weekNumber / program.weeks) * 100, 100) : 0;

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Program Header */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-white">{program.name}</h1>
              <p className="text-xs text-[hsl(0_0%_40%)]">الأسبوع {weekNumber} من {program.weeks} — {Math.round(weekProgress)}%</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[hsl(0_0%_10%)] text-[hsl(0_0%_50%)]">{program.days.length} أيام</span>
          </div>
          <Progress value={weekProgress} className="h-1.5" />
        </div>

        {/* Weekly Schedule */}
        <div>
          <h3 className="text-sm font-bold text-white mb-2">الجدول الأسبوعي</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {WEEKDAYS.map((dayName, idx) => {
              const matchDay = program.days.find(d => d.day_name.includes(dayName));
              const isToday = idx === todayIndex;
              const hasWorkout = !!matchDay && matchDay.exercises.filter(e => !e.is_warmup).length > 0;
              return (
                <button
                  key={dayName}
                  onClick={() => matchDay && startWorkout(matchDay.id)}
                  disabled={!hasWorkout}
                  className={`flex-shrink-0 w-16 rounded-xl p-2.5 text-center border transition-all ${
                    isToday && hasWorkout
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : hasWorkout
                      ? "bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)] hover:border-primary/30"
                      : "bg-[hsl(0_0%_4%)] border-transparent opacity-50"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 text-[hsl(0_0%_50%)]">{dayName.slice(0, 3)}</p>
                  {hasWorkout
                    ? <Dumbbell className="w-4 h-4 text-primary mx-auto" strokeWidth={1.5} />
                    : <Moon className="w-4 h-4 text-[hsl(0_0%_25%)] mx-auto" strokeWidth={1.5} />
                  }
                </button>
              );
            })}
          </div>
        </div>

        {/* Days List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">تمارين البرنامج</h3>
          {program.days.map(day => {
            const isToday = day.day_name.includes(todayDayName);
            const mainExercises = day.exercises.filter(e => !e.is_warmup);
            const warmups = day.exercises.filter(e => e.is_warmup);
            const isExpanded = expandedDay === day.id;
            const estVolume = mainExercises.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
            
            return (
              <div key={day.id} className={`bg-[hsl(0_0%_6%)] rounded-xl border overflow-hidden ${
                isToday ? "border-primary/30" : "border-[hsl(0_0%_10%)]"
              }`}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-[hsl(0_0%_8%)]">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <h4 className="font-semibold text-sm text-white">{day.day_name}</h4>
                    {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">اليوم</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                      className="text-[hsl(0_0%_40%)] hover:text-white p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                    <Button size="sm" variant="ghost" className="text-xs gap-1 text-[hsl(0_0%_40%)] hover:text-primary"
                      onClick={() => startWorkout(day.id)}>
                      <Play className="w-3 h-3" strokeWidth={1.5} /> ابدأ
                    </Button>
                  </div>
                </div>
                
                {/* Summary row */}
                <div className="px-4 py-2 flex items-center gap-4 text-[10px] text-[hsl(0_0%_35%)]">
                  <span>{mainExercises.length} تمارين</span>
                  {warmups.length > 0 && <span>{warmups.length} إحماء</span>}
                  {estVolume > 0 && <span>{(estVolume / 1000).toFixed(0)}k كجم</span>}
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-1 border-t border-[hsl(0_0%_8%)]">
                    {warmups.length > 0 && (
                      <p className="text-[10px] text-amber-400 mb-1">الإحماء</p>
                    )}
                    {warmups.map((exercise, idx) => (
                      <div key={exercise.id} className="flex items-center justify-between py-1.5 text-sm bg-amber-500/5 rounded-lg px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[hsl(0_0%_25%)] w-5 tabular-nums">{idx + 1}.</span>
                          <span className="text-amber-200/70 text-xs">{exercise.name}</span>
                        </div>
                        <span className="text-xs text-[hsl(0_0%_35%)] tabular-nums">
                          {exercise.sets}×{exercise.reps}
                        </span>
                      </div>
                    ))}
                    {warmups.length > 0 && mainExercises.length > 0 && (
                      <div className="h-px bg-[hsl(0_0%_10%)] my-1" />
                    )}
                    {mainExercises.map((exercise, idx) => (
                      <div key={exercise.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[hsl(0_0%_25%)] w-5 tabular-nums">{idx + 1}.</span>
                          <span className="text-[hsl(0_0%_70%)]">{exercise.name}</span>
                          {exercise.rpe && <span className="text-[9px] text-amber-400">RPE {exercise.rpe}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {exercise.tempo && <span className="text-[9px] font-mono text-[hsl(0_0%_25%)]">{exercise.tempo}</span>}
                          <span className="text-xs text-[hsl(0_0%_35%)] tabular-nums">
                            {exercise.sets}×{exercise.reps} {exercise.weight > 0 && `@ ${exercise.weight}كجم`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalWorkout;
