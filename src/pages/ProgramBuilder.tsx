import { useState, useCallback, useEffect, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, ArrowLeft, Calendar, Users, Dumbbell, Trash2,
  ClipboardList, Loader2, Save, BookOpen, ChevronRight, Eye,
  Check,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import SaveAsTemplateModal from "@/components/templates/SaveAsTemplateModal";
import CreateProgramModal from "@/components/program/CreateProgramModal";
import WeekDayNav, { WeekData, DayData } from "@/components/program/WeekDayNav";
import DayWorkoutEditor, { EditorDay } from "@/components/program/DayWorkoutEditor";
import ExerciseLibraryPanel from "@/components/program/ExerciseLibraryPanel";
import SmartWarnings from "@/components/program/SmartWarnings";
import { LocalExercise, LocalDay, genId } from "@/components/program/types";
import type { SelectedExercise } from "@/components/program/ExerciseLibraryPanel";

// ──────────────── Types ────────────────
interface ProgramDay {
  id: string;
  weekIndex: number;
  label: string;
  type: "training" | "rest" | "active_rest";
  exercises: LocalExercise[];
}

// ──────────────── Component ────────────────
const ProgramBuilder = () => {
  usePageTitle("البرامج");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── View State
  const [view, setView] = useState<"list" | "editor">("list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Editor State
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programName, setProgramName] = useState("");
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [programWeeks, setProgramWeeks] = useState(8);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

  // ── Auto-save
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (view !== "editor") return;
    autoSaveRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [view, hasUnsavedChanges]);

  // ── Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && view === "editor") {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, days, programName]);

  // ── Data
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, program_id");
      return data || [];
    },
    enabled: !!user,
  });

  // ──────────── HELPERS ────────────
  const getWeeks = useCallback((): WeekData[] => {
    const weekMap = new Map<number, DayData[]>();
    for (let i = 0; i < programWeeks; i++) weekMap.set(i, []);

    days.forEach(d => {
      const list = weekMap.get(d.weekIndex) || [];
      list.push({
        id: d.id,
        label: d.label,
        type: d.type,
        exerciseCount: d.exercises.length,
      });
      weekMap.set(d.weekIndex, list);
    });

    return Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([idx, dayList]) => ({ weekNumber: idx + 1, days: dayList }));
  }, [days, programWeeks]);

  const getActiveDay = useCallback((): EditorDay | null => {
    const d = days.find(d => d.id === activeDayId);
    if (!d) return null;
    return { id: d.id, label: d.label, type: d.type, exercises: d.exercises };
  }, [days, activeDayId]);

  const updateDayField = useCallback((dayId: string, updater: (d: ProgramDay) => ProgramDay) => {
    setDays(prev => prev.map(d => d.id === dayId ? updater(d) : d));
    setHasUnsavedChanges(true);
  }, []);

  // ──────────── PROGRAM CREATION ────────────
  const handleCreateProgram = (data: { name: string; goal: string; level: string; weeks: number; daysPerWeek: number }) => {
    setProgramName(data.name);
    setProgramGoal(data.goal);
    setProgramLevel(data.level);
    setProgramWeeks(data.weeks);
    setEditingProgramId(null);

    // Generate days
    const newDays: ProgramDay[] = [];
    for (let w = 0; w < data.weeks; w++) {
      for (let d = 0; d < data.daysPerWeek; d++) {
        newDays.push({
          id: genId(),
          weekIndex: w,
          label: `اليوم ${d + 1}`,
          type: "training",
          exercises: [],
        });
      }
    }
    setDays(newDays);
    setActiveWeek(0);
    setActiveDayId(newDays[0]?.id || null);
    setShowCreateModal(false);
    setView("editor");
    setLastSaved(null);
    setHasUnsavedChanges(false);
  };

  // ──────────── WEEK/DAY OPERATIONS ────────────
  const handleAddDay = (weekIdx: number) => {
    const weekDays = days.filter(d => d.weekIndex === weekIdx);
    const newDay: ProgramDay = {
      id: genId(),
      weekIndex: weekIdx,
      label: `اليوم ${weekDays.length + 1}`,
      type: "training",
      exercises: [],
    };
    setDays(prev => [...prev, newDay]);
    setActiveDayId(newDay.id);
    setHasUnsavedChanges(true);
  };

  const handleAddWeek = () => {
    setProgramWeeks(prev => prev + 1);
    setHasUnsavedChanges(true);
  };

  const handleDuplicateWeek = (weekIdx: number) => {
    const weekDays = days.filter(d => d.weekIndex === weekIdx);
    const newWeekIdx = programWeeks;
    const newDays = weekDays.map(d => ({
      ...d,
      id: genId(),
      weekIndex: newWeekIdx,
      exercises: d.exercises.map(e => ({ ...e, id: genId(), supersetWith: undefined })),
    }));
    setProgramWeeks(prev => prev + 1);
    setDays(prev => [...prev, ...newDays]);
    setHasUnsavedChanges(true);
    toast({ title: "تم تكرار الأسبوع" });
  };

  const handleCreateDeload = (weekIdx: number) => {
    const weekDays = days.filter(d => d.weekIndex === weekIdx);
    const newWeekIdx = programWeeks;
    const newDays = weekDays.map(d => ({
      ...d,
      id: genId(),
      weekIndex: newWeekIdx,
      label: d.label + " (ديلود)",
      exercises: d.exercises.map(e => ({
        ...e,
        id: genId(),
        supersetWith: undefined,
        sets: Math.max(2, Math.round(e.sets * 0.6)),
        weight: Math.round(e.weight * 0.7),
        rpe: e.rpe ? Math.max(5, e.rpe - 2) : 6,
        notes: e.notes ? e.notes + " [ديلود]" : "ديلود - حجم مخفض 40%",
        setDetails: e.setDetails?.map(s => ({
          ...s,
          weight: Math.round(s.weight * 0.7),
        })),
      })),
    }));
    setProgramWeeks(prev => prev + 1);
    setDays(prev => [...prev, ...newDays]);
    setHasUnsavedChanges(true);
    toast({ title: "تم إنشاء أسبوع ديلود (حجم مخفض 40%)" });
  };

  // ──────────── EXERCISE OPERATIONS ────────────
  const handleAddExercises = (selected: SelectedExercise[]) => {
    if (!activeDayId) return;
    const newExercises: LocalExercise[] = selected.map(item => ({
      id: genId(),
      name: item.name_ar,
      name_en: item.name_en,
      muscle: item.bodyPart,
      gifUrl: item.gifUrl,
      exerciseDbId: item.id,
      sets: 3,
      reps: 10,
      weight: 0,
      video_url: "",
      rest_seconds: 60,
      tempo: "",
      rpe: null,
      notes: "",
      is_warmup: false,
    }));
    updateDayField(activeDayId, d => ({ ...d, exercises: [...d.exercises, ...newExercises] }));
    setShowLibrary(false);
  };

  const handleRemoveExercise = (exId: string) => {
    if (!activeDayId) return;
    updateDayField(activeDayId, d => ({
      ...d,
      exercises: d.exercises.filter(e => e.id !== exId),
    }));
  };

  const handleDuplicateExercise = (exId: string) => {
    if (!activeDayId) return;
    updateDayField(activeDayId, d => {
      const idx = d.exercises.findIndex(e => e.id === exId);
      if (idx === -1) return d;
      const exs = [...d.exercises];
      exs.splice(idx + 1, 0, {
        ...exs[idx],
        id: genId(),
        supersetWith: undefined,
        setDetails: exs[idx].setDetails?.map(s => ({ ...s })),
      });
      return { ...d, exercises: exs };
    });
  };

  const handleMoveExercise = (exId: string, dir: "up" | "down") => {
    if (!activeDayId) return;
    updateDayField(activeDayId, d => {
      const exs = [...d.exercises];
      const idx = exs.findIndex(e => e.id === exId);
      const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= exs.length) return d;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...d, exercises: exs };
    });
  };

  const handleToggleSuperset = (exId: string) => {
    if (!activeDayId) return;
    updateDayField(activeDayId, d => {
      const exs = [...d.exercises];
      const idx = exs.findIndex(e => e.id === exId);
      if (idx === -1 || idx >= exs.length - 1) return d;
      const current = exs[idx];
      const next = exs[idx + 1];
      if (current.supersetWith === next.id) {
        exs[idx] = { ...current, supersetWith: undefined };
        exs[idx + 1] = { ...next, supersetWith: undefined };
      } else {
        exs[idx] = { ...current, supersetWith: next.id };
        exs[idx + 1] = { ...next, supersetWith: current.id };
      }
      return { ...d, exercises: exs };
    });
  };

  const handleUpdateExercise = (exId: string, field: keyof LocalExercise, value: any) => {
    if (!activeDayId) return;
    updateDayField(activeDayId, d => ({
      ...d,
      exercises: d.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e),
    }));
  };

  // ──────────── SAVE ────────────
  const saveMutation = useMutation({
    mutationFn: async (asTemplate: boolean) => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      const trainingDays = days.filter(d => d.type === "training" && d.exercises.length > 0);
      if (trainingDays.length === 0) throw new Error("أضف تمارين في يوم واحد على الأقل");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({
          trainer_id: user!.id,
          name: programName.trim(),
          weeks: programWeeks,
          goal: programGoal || null,
          difficulty: programLevel || null,
          is_template: asTemplate,
        })
        .select().single();
      if (pErr) throw pErr;

      // Insert unique days (deduplicated by label per week isn't needed - insert all training days)
      const daysToInsert = trainingDays.map((d, i) => ({
        program_id: program.id,
        day_name: d.label,
        day_order: i,
      }));
      const { data: savedDays, error: dErr } = await supabase.from("program_days").insert(daysToInsert).select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      savedDays!.forEach((savedDay, idx) => {
        const localDay = trainingDays[idx];
        if (localDay) {
          localDay.exercises.forEach((ex, exIdx) => {
            exercisesToInsert.push({
              day_id: savedDay.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              exercise_order: exIdx,
              video_url: ex.video_url || null,
              rest_seconds: ex.rest_seconds,
              tempo: ex.tempo || null,
              rpe: ex.rpe,
              notes: ex.notes || null,
              superset_group: ex.supersetWith || null,
              is_warmup: ex.is_warmup || false,
            });
          });
        }
      });

      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }
      return program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setView("list");
      setHasUnsavedChanges(false);
      setAssignProgramId(program.id);
      toast({ title: "تم حفظ البرنامج بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const handleSave = (asTemplate: boolean) => {
    saveMutation.mutate(asTemplate);
  };

  // ── Open existing program in editor
  const handleOpenProgram = async (programId: string) => {
    try {
      const program = programs.find(p => p.id === programId);
      if (!program) return;

      setProgramName(program.name);
      setProgramGoal(program.goal || "");
      setProgramLevel(program.difficulty || "");
      setProgramWeeks(program.weeks);
      setEditingProgramId(programId);

      // Fetch days and exercises
      const { data: dbDays } = await supabase
        .from("program_days")
        .select("*")
        .eq("program_id", programId)
        .order("day_order");

      const { data: dbExercises } = await supabase
        .from("program_exercises")
        .select("*")
        .in("day_id", (dbDays || []).map(d => d.id))
        .order("exercise_order");

      const loadedDays: ProgramDay[] = (dbDays || []).map((d, i) => ({
        id: d.id,
        weekIndex: Math.floor(i / 7),
        label: d.day_name,
        type: "training" as const,
        exercises: (dbExercises || [])
          .filter(e => e.day_id === d.id)
          .map(e => ({
            id: e.id,
            name: e.name,
            name_en: "",
            muscle: "",
            gifUrl: e.video_url || "",
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            video_url: e.video_url || "",
            rest_seconds: e.rest_seconds,
            tempo: e.tempo || "",
            rpe: e.rpe,
            notes: e.notes || "",
            is_warmup: e.is_warmup,
            supersetWith: e.superset_group || undefined,
          })),
      }));

      setDays(loadedDays.length > 0 ? loadedDays : []);
      setActiveWeek(0);
      setActiveDayId(loadedDays[0]?.id || null);
      setView("editor");
      setLastSaved(null);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error loading program:", err);
      toast({ title: "خطأ في تحميل البرنامج", variant: "destructive" });
    }
  };

  // ── Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: "تم حذف البرنامج" });
    },
  });

  // ── Smart warnings data (convert to LocalDay format)
  const getSmartWarningDays = (): LocalDay[] => {
    const activeWeekDays = days.filter(d => d.weekIndex === activeWeek);
    return activeWeekDays.map(d => ({
      dayName: d.label,
      isRest: d.type !== "training",
      exercises: d.exercises,
      warmup: [],
      label: d.label,
    }));
  };

  // ════════════════ EDITOR VIEW ════════════════
  if (view === "editor") {
    const activeDay = getActiveDay();
    const weeks = getWeeks();

    return (
      <div className="h-screen flex flex-col bg-background" dir="rtl">
        {/* Top Bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <Input
              value={programName}
              onChange={e => { setProgramName(e.target.value); setHasUnsavedChanges(true); }}
              className="border-0 bg-transparent text-base font-bold p-0 h-auto focus-visible:ring-0 max-w-[300px]"
              placeholder="اسم البرنامج"
            />
            {programGoal && <Badge variant="secondary" className="text-[10px]">{programGoal}</Badge>}
            {programLevel && <Badge variant="secondary" className="text-[10px]">{programLevel}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            {/* Save indicator */}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                تم الحفظ {lastSaved.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-[10px] text-warning flex items-center gap-1">تغييرات غير محفوظة</span>
            )}

            <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setShowSaveTemplateModal(true)}
              disabled={saveMutation.isPending}>
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />حفظ كقالب
            </Button>
            <Button size="sm" className="gap-1 text-xs h-8" onClick={() => handleSave(false)}
              disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" strokeWidth={1.5} />}
              حفظ
            </Button>
          </div>
        </div>

        {/* Main Content - 3 Panel Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Week/Day Nav */}
          <div className="w-56 flex-shrink-0">
            <WeekDayNav
              weeks={weeks}
              activeWeek={activeWeek}
              activeDayId={activeDayId}
              onSelectDay={(wIdx, dayId) => {
                setActiveWeek(wIdx);
                setActiveDayId(dayId);
                setShowLibrary(false);
              }}
              onAddDay={handleAddDay}
              onAddWeek={handleAddWeek}
              onDuplicateWeek={handleDuplicateWeek}
              onCreateDeload={handleCreateDeload}
              onRenameDayLabel={(wIdx, dayId, label) => updateDayField(dayId, d => ({ ...d, label }))}
              onChangeDayType={(wIdx, dayId, type) => updateDayField(dayId, d => ({ ...d, type }))}
            />
          </div>

          {/* Center: Day Workout Editor */}
          <div className="flex-1 flex flex-col min-w-0 border-l border-border">
            {/* Smart Warnings */}
            {activeDay && activeDay.exercises.length > 0 && (
              <div className="px-4 pt-3">
                <SmartWarnings days={getSmartWarningDays()} weeks={programWeeks} currentWeek={activeWeek + 1} />
              </div>
            )}
            <DayWorkoutEditor
              day={activeDay}
              onUpdateLabel={label => activeDayId && updateDayField(activeDayId, d => ({ ...d, label }))}
              onUpdateType={type => activeDayId && updateDayField(activeDayId, d => ({
                ...d,
                type,
                exercises: type !== "training" ? [] : d.exercises,
              }))}
              onUpdateExercise={handleUpdateExercise}
              onRemoveExercise={handleRemoveExercise}
              onDuplicateExercise={handleDuplicateExercise}
              onMoveExercise={handleMoveExercise}
              onToggleSuperset={handleToggleSuperset}
              onOpenLibrary={() => setShowLibrary(true)}
            />
          </div>

          {/* Right: Exercise Library Panel */}
          {showLibrary && (
            <div className="w-80 flex-shrink-0 border-l border-border animate-in slide-in-from-left duration-200">
              <ExerciseLibraryPanel
                open={showLibrary}
                onClose={() => setShowLibrary(false)}
                onAdd={handleAddExercises}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════ LIST VIEW ════════════════
  const filteredPrograms = searchQuery
    ? programs.filter(p => p.name.includes(searchQuery))
    : programs;

  const getClientCount = (pid: string) => clients.filter((c: any) => c.program_id === pid).length;

  const assignProgram = programs.find(p => p.id === assignProgramId);

  return (
    <TrainerLayout>
      <div className="space-y-6 animate-fade-in" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">البرامج التدريبية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{programs.length} برنامج</p>
          </div>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1">
            <Plus className="w-4 h-4" strokeWidth={1.5} />برنامج جديد
          </Button>
        </div>

        {/* Search */}
        {programs.length > 3 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
            <Input placeholder="ابحث في البرامج..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
          </div>
        )}

        {/* Programs Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredPrograms.length === 0 && !searchQuery ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <ClipboardList className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground">لم تبنِ برامج بعد</h3>
            <p className="text-sm text-muted-foreground">أنشئ أول برنامج تدريبي لعملائك</p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-1">
              <Plus className="w-4 h-4" strokeWidth={1.5} />برنامج جديد
            </Button>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPrograms.map((program: any) => {
              const clientCount = getClientCount(program.id);
              const isTemplate = program.is_template;
              return (
                <Card key={program.id}
                  className={`p-4 transition-all cursor-pointer group hover:shadow-md hover:border-primary/40 ${isTemplate ? "border-r-2 border-r-amber-500/50" : ""}`}
                  onClick={() => handleOpenProgram(program.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">{program.name}</h3>
                      {isTemplate && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px]">قالب</Badge>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors rotate-180" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-[10px]">
                      <Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{program.weeks} أسابيع
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      <Users className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{clientCount} متدرب
                    </Badge>
                    {program.goal && <Badge variant="secondary" className="text-[10px]">{program.goal}</Badge>}
                    {program.difficulty && <Badge variant="secondary" className="text-[10px]">{program.difficulty}</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                      onClick={e => { e.stopPropagation(); setAssignProgramId(program.id); }}>
                      <Users className="w-3 h-3" strokeWidth={1.5} />تعيين
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive gap-0.5"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(program.id); }}>
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateProgramModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateProgram}
      />

      {/* Assign Modal */}
      {assignProgram && (
        <CopyProgramModal
          open={!!assignProgramId}
          onOpenChange={o => { if (!o) setAssignProgramId(null); }}
          program={assignProgram}
          clients={clients as any}
          programs={programs}
        />
      )}
    </TrainerLayout>
  );
};

export default ProgramBuilder;
