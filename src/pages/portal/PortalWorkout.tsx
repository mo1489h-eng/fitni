import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Check, ArrowLeft, Timer, Play, ChevronLeft, ChevronRight, Dumbbell, Trophy, Flame, Calendar as CalendarIcon, Sparkles, Moon, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ExerciseData {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  video_url: string | null;
  exercise_order: number;
}

interface ProgramDay {
  id: string;
  day_name: string;
  day_order: number;
  exercises: ExerciseData[];
}

interface ProgramData {
  id: string;
  name: string;
  weeks: number;
  days: ProgramDay[];
}

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const PortalWorkout = () => {
  const navigate = useNavigate();
  const { token } = usePortalToken();
  const [activeTab, setActiveTab] = useState("program");
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);

  // Workout mode state
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [actualWeight, setActualWeight] = useState("");
  const [actualReps, setActualReps] = useState("");
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(60);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  // Fetch client data
  const { data: clientData } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  // Fetch program with days and exercises
  const { data: program, isLoading } = useQuery({
    queryKey: ["portal-program", clientData?.program_id],
    queryFn: async () => {
      if (!clientData?.program_id) return null;
      const { data: prog } = await supabase
        .from("programs")
        .select("id, name, weeks")
        .eq("id", clientData.program_id)
        .maybeSingle();
      if (!prog) return null;

      const { data: days } = await supabase
        .from("program_days")
        .select("id, day_name, day_order")
        .eq("program_id", prog.id)
        .order("day_order");

      const enrichedDays: ProgramDay[] = [];
      for (const day of days || []) {
        const { data: exercises } = await supabase
          .from("program_exercises")
          .select("id, name, sets, reps, weight, video_url, exercise_order")
          .eq("day_id", day.id)
          .order("exercise_order");
        enrichedDays.push({ ...day, exercises: exercises || [] });
      }

      return { ...prog, days: enrichedDays } as ProgramData;
    },
    enabled: !!clientData?.program_id,
  });

  const todayIndex = new Date().getDay(); // 0=Sun
  const weekNumber = clientData?.week_number || 1;

  const activeDay = useMemo(() => {
    if (!program?.days) return null;
    if (activeDayId) return program.days.find(d => d.id === activeDayId) || null;
    // Find today's matching day
    const todayName = WEEKDAYS[todayIndex];
    return program.days.find(d => d.day_name.includes(todayName)) || program.days[0] || null;
  }, [program, activeDayId, todayIndex]);

  const activeExercises = activeDay?.exercises || [];
  const ex = activeExercises[currentExIdx];
  const isLastSet = currentSet >= (ex?.sets || 0);
  const isLastExercise = currentExIdx >= activeExercises.length - 1;

  // Rest timer
  useEffect(() => {
    if (!resting) return;
    if (restTime <= 0) {
      setResting(false);
      setRestTime(60);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      return;
    }
    const t = setTimeout(() => setRestTime(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restTime]);

  const startWorkout = (dayId: string) => {
    setActiveDayId(dayId);
    setWorkoutStarted(true);
    setCurrentExIdx(0);
    setCurrentSet(1);
    setCompleted(false);
    setTotalSets(0);
    setTotalVolume(0);
    setStartTime(Date.now());
    setActualWeight("");
    setActualReps("");
  };

  const handleCompleteSet = useCallback(() => {
    const w = Number(actualWeight) || ex?.weight || 0;
    const r = Number(actualReps) || ex?.reps || 0;
    setTotalVolume(v => v + w * r);
    setTotalSets(s => s + 1);

    if (isLastSet && isLastExercise) {
      setCompleted(true);
      return;
    }
    if (isLastSet) {
      setCurrentExIdx(i => i + 1);
      setCurrentSet(1);
      setActualWeight("");
      setActualReps("");
    } else {
      setCurrentSet(s => s + 1);
      setResting(true);
      setActualWeight("");
      setActualReps("");
    }
  }, [isLastSet, isLastExercise, actualWeight, actualReps, ex]);

  const skipRest = () => { setResting(false); setRestTime(60); };

  const estimatedTime = useMemo(() => {
    if (!activeExercises.length) return 0;
    return activeExercises.reduce((sum, e) => sum + e.sets * 2, 0); // ~2 min per set
  }, [activeExercises]);

  // ── CELEBRATION SCREEN ──
  if (workoutStarted && completed) {
    const mins = Math.round((Date.now() - startTime) / 60000);
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in space-y-6" dir="rtl">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border border-primary/20">
            <Trophy className="w-10 h-10 text-primary" />
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
            <Dumbbell className="absolute -bottom-2 -left-2 w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">أحسنت! أكملت التمرين</h1>
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            <div className="bg-card rounded-xl p-3 border border-border">
              <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{activeExercises.length}</p>
              <p className="text-[10px] text-muted-foreground">تمارين</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{totalSets}</p>
              <p className="text-[10px] text-muted-foreground">سيت</p>
            </div>
            <div className="bg-card rounded-xl p-3 border border-border">
              <Timer className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{mins || 1}</p>
              <p className="text-[10px] text-muted-foreground">دقيقة</p>
            </div>
          </div>
          {totalVolume > 0 && (
            <Card className="p-4 w-full max-w-xs bg-primary/5 border-primary/20">
              <div className="flex items-center justify-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">مجموع الوزن المرفوع</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{totalVolume.toLocaleString()} كجم</p>
            </Card>
          )}
          <Button className="w-full max-w-xs py-6 text-base" onClick={() => { setWorkoutStarted(false); setCompleted(false); }}>
            عودة للبرنامج
          </Button>
        </div>
      </ClientPortalLayout>
    );
  }

  // ── REST TIMER ──
  if (workoutStarted && resting && ex) {
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference * (1 - restTime / 60);
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in space-y-6" dir="rtl">
          <Timer className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">وقت الراحة</p>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-1000 ease-linear" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-foreground">{restTime}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">السيت التالي: {currentSet} من {ex.sets}</p>
          <Button variant="outline" onClick={skipRest}>تخطي الراحة</Button>
        </div>
      </ClientPortalLayout>
    );
  }

  // ── ACTIVE WORKOUT MODE ──
  if (workoutStarted && ex) {
    const exerciseProgress = ((currentExIdx) / activeExercises.length) * 100;
    return (
      <ClientPortalLayout>
        <div className="space-y-5 animate-fade-in" dir="rtl">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>تمرين {currentExIdx + 1} من {activeExercises.length}</span>
              <span>{Math.round(exerciseProgress)}%</span>
            </div>
            <Progress value={exerciseProgress} className="h-2" />
          </div>

          <Card className="p-5 text-center">
            <h1 className="text-2xl font-bold text-card-foreground mt-1 mb-2">{ex.name} 🎯</h1>
            <p className="text-muted-foreground">
              المطلوب: {ex.sets} سيت × {ex.reps} تكرار{ex.weight > 0 && ` × ${ex.weight} كجم`}
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-card-foreground text-center mb-4">السيت {currentSet} من {ex.sets}</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">الوزن (كجم)</label>
                <Input type="number" dir="ltr" placeholder={String(ex.weight || "—")} value={actualWeight} onChange={e => setActualWeight(e.target.value)} className="text-center text-lg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">التكرارات</label>
                <Input type="number" dir="ltr" placeholder={String(ex.reps)} value={actualReps} onChange={e => setActualReps(e.target.value)} className="text-center text-lg" />
              </div>
            </div>
            <Button className="w-full py-6 text-base gap-2" onClick={handleCompleteSet}>
              <Check className="w-5 h-5" />
              {isLastSet && isLastExercise ? "إنهاء التمرين 🎉" : "✅ أكمل السيت"}
            </Button>
          </Card>

          {!isLastExercise && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>التالي: {activeExercises[currentExIdx + 1]?.name}</span>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {Array.from({ length: ex.sets }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < currentSet - 1 ? "bg-primary" : i === currentSet - 1 ? "bg-primary/50 ring-2 ring-primary/30" : "bg-border"}`} />
            ))}
          </div>
        </div>
      </ClientPortalLayout>
    );
  }

  // ── PROGRAM OVERVIEW ──
  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientPortalLayout>
    );
  }

  if (!program) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center" dir="rtl">
          <Dumbbell className="w-14 h-14 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">لا يوجد برنامج بعد</h2>
          <p className="text-sm text-muted-foreground">مدربك لم يخصص لك برنامج تدريبي حتى الآن</p>
        </div>
      </ClientPortalLayout>
    );
  }

  // Find today's day
  const todayDayName = WEEKDAYS[todayIndex];
  const todayDay = program.days.find(d => d.day_name.includes(todayDayName));
  const weekProgress = program.weeks > 0 ? Math.min((weekNumber / program.weeks) * 100, 100) : 0;

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in" dir="rtl">
        {/* Program Overview */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">{program.name}</h1>
              <p className="text-xs text-muted-foreground">الأسبوع {weekNumber} من {program.weeks}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{program.days.length} أيام تدريب</Badge>
          </div>
          <Progress value={weekProgress} className="h-2" />
        </Card>

        {/* Today's Workout Hero */}
        {todayDay && todayDay.exercises.length > 0 ? (
          <Card className="p-5 bg-primary text-primary-foreground border-0">
            <p className="text-sm opacity-80 mb-1">تمرين اليوم 💪</p>
            <h2 className="text-xl font-bold mb-1">{todayDay.day_name}</h2>
            <p className="text-sm opacity-80 mb-4">
              {todayDay.exercises.length} تمارين • ~{todayDay.exercises.reduce((s, e) => s + e.sets * 2, 0)} دقيقة
            </p>
            <Button
              variant="secondary"
              className="w-full py-5 text-base gap-2 font-bold"
              onClick={() => startWorkout(todayDay.id)}
            >
              <Play className="w-5 h-5" />
              ابدأ التمرين ←
            </Button>
          </Card>
        ) : (
          <Card className="p-5 bg-muted/50 text-center">
            <p className="text-lg mb-1">😴</p>
            <h2 className="text-lg font-bold text-foreground">يوم راحة</h2>
            <p className="text-sm text-muted-foreground">استرح اليوم واستعد لتمرين الغد</p>
          </Card>
        )}

        {/* Weekly Schedule - Horizontal Scroll */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">الجدول الأسبوعي</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {WEEKDAYS.map((dayName, idx) => {
              const matchDay = program.days.find(d => d.day_name.includes(dayName));
              const isToday = idx === todayIndex;
              const hasWorkout = !!matchDay && matchDay.exercises.length > 0;

              return (
                <button
                  key={dayName}
                  onClick={() => matchDay && startWorkout(matchDay.id)}
                  disabled={!hasWorkout}
                  className={`flex-shrink-0 w-16 rounded-xl p-2.5 text-center border transition-all ${
                    isToday
                      ? "bg-primary/10 border-primary text-primary"
                      : hasWorkout
                      ? "bg-card border-border hover:border-primary/50"
                      : "bg-muted/30 border-transparent opacity-60"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">{dayName.slice(0, 3)}</p>
                  <p className="text-base mb-0.5">{hasWorkout ? "💪" : "😴"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {hasWorkout ? matchDay!.day_name.replace(dayName, "").trim() || "تمرين" : "راحة"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Days - Exercise List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">تمارين البرنامج</h3>
          {program.days.map(day => (
            <Card key={day.id} className="overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm text-foreground">{day.day_name}</h4>
                </div>
                <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => startWorkout(day.id)}>
                  <Play className="w-3 h-3" /> ابدأ
                </Button>
              </div>
              <div className="p-3 space-y-1.5">
                {day.exercises.map((exercise, idx) => (
                  <div key={exercise.id} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <span className="text-foreground">{exercise.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {exercise.sets}×{exercise.reps} {exercise.weight > 0 && `@ ${exercise.weight}كجم`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalWorkout;
