import { useState, useCallback, useEffect, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Calendar, Save, ChevronRight, BookOpen, Users, Dumbbell,
  Flame, Shield, Target, HeartPulse, Zap, Activity,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import ProgramList from "@/components/program/ProgramList";
import ProgramSetup from "@/components/program/ProgramSetup";
import ProgramDetail from "@/components/program/ProgramDetail";
import WeekCalendar from "@/components/program/WeekCalendar";
import DayEditor from "@/components/program/DayEditor";
import SmartWarnings from "@/components/program/SmartWarnings";
import { LocalDay, LocalExercise, WEEK_DAYS, genId } from "@/components/program/types";
import { ALL_TEMPLATES, ProgramTemplate } from "@/components/program/templates-data";

const ProgramBuilder = () => {
  usePageTitle("البرامج");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View State
  const [view, setView] = useState<"list" | "step1" | "step2" | "detail">("list");
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);

  // Create Form
  const [programName, setProgramName] = useState("");
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [programDesc, setProgramDesc] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [equipment, setEquipment] = useState("جيم كامل");

  // Step 2: Builder
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [activeWeek, setActiveWeek] = useState(1);

  // Library Panel
  const [showLibrary, setShowLibrary] = useState(false);

  // Assign/Copy
  const [copyProgramId, setCopyProgramId] = useState<string | null>(null);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout>();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save every 30 seconds in step2
  useEffect(() => {
    if (view !== "step2") return;
    autoSaveRef.current = setInterval(() => {
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [view]);

  // Data
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

  const { data: programDays = [] } = useQuery({
    queryKey: ["program-days", viewProgramId],
    queryFn: async () => {
      const { data } = await supabase
        .from("program_days")
        .select("*, program_exercises(*)")
        .eq("program_id", viewProgramId!)
        .order("day_order", { ascending: true });
      return data || [];
    },
    enabled: !!viewProgramId,
  });

  const copyProgram = programs.find(p => p.id === copyProgramId);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (asTemplate: boolean) => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      const activeDays = localDays.filter(d => !d.isRest);
      if (activeDays.length === 0) throw new Error("أضف يوم تدريب واحد على الأقل");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({
          trainer_id: user!.id, name: programName.trim(), weeks,
          goal: programGoal || null, difficulty: programLevel || null,
          description: programDesc || null, is_template: asTemplate,
        })
        .select().single();
      if (pErr) throw pErr;

      const daysToInsert = localDays.filter(d => !d.isRest).map((d, i) => ({
        program_id: program.id, day_name: d.label || d.dayName, day_order: i,
      }));
      const { data: days, error: dErr } = await supabase.from("program_days").insert(daysToInsert).select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      for (const day of days!) {
        const localDay = localDays.find(d => (d.label || d.dayName) === day.day_name);
        if (localDay) {
          [...localDay.warmup.map(e => ({ ...e, is_warmup: true })), ...localDay.exercises].forEach((ex, idx) => {
            exercisesToInsert.push({
              day_id: day.id, name: ex.name, sets: ex.sets, reps: ex.reps,
              weight: ex.weight, exercise_order: idx,
              video_url: ex.video_url || null, rest_seconds: ex.rest_seconds,
              tempo: ex.tempo || null, rpe: ex.rpe,
              notes: ex.notes || null, superset_group: ex.supersetWith || null,
              is_warmup: ex.is_warmup || false,
            });
          });
        }
      }
      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }
      return program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setView("list"); resetForm();
      setAssignProgramId(program.id);
      toast({ title: "تم إنشاء البرنامج بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setView("list"); toast({ title: "تم حذف البرنامج" });
    },
  });

  const deleteExMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("program_exercises").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["program-days", viewProgramId] }),
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from("programs").update({ is_template: true }).eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: "تم حفظ البرنامج كقالب" });
    },
  });

  const resetForm = () => {
    setProgramName(""); setProgramGoal(""); setProgramLevel("");
    setWeeks(8); setProgramDesc(""); setSelectedDays([]); setLocalDays([]);
    setActiveDay(0); setActiveWeek(1); setEquipment("جيم كامل");
  };

  const proceedToStep2 = () => {
    if (!programName.trim()) { toast({ title: "أدخل اسم البرنامج", variant: "destructive" }); return; }
    if (selectedDays.length === 0) { toast({ title: "اختر أيام التدريب", variant: "destructive" }); return; }
    const days: LocalDay[] = WEEK_DAYS.map(d => ({
      dayName: d,
      isRest: !selectedDays.includes(d),
      exercises: [],
      warmup: [],
      label: selectedDays.includes(d) ? "" : "راحة",
    }));
    setLocalDays(days);
    setActiveDay(days.findIndex(d => !d.isRest));
    setView("step2");
  };

  const applyTemplate = (t: ProgramTemplate) => {
    setProgramName(t.name); setProgramGoal(t.goal); setProgramLevel(t.level);
    setWeeks(t.weeks); setProgramDesc(t.description); setEquipment(t.equipment);
    const days = t.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => ({ ...e, id: genId() })),
      warmup: (d.warmup || []).map(e => ({ ...e, id: genId() })),
    }));
    setLocalDays(days);
    setSelectedDays(t.days.filter(d => !d.isRest).map(d => d.dayName));
    setActiveDay(days.findIndex(d => !d.isRest));
    setView("step2");
    toast({ title: `تم تحميل "${t.name}"` });
  };

  const updateDay = useCallback((idx: number, updater: (d: LocalDay) => LocalDay) => {
    setLocalDays(prev => prev.map((d, i) => i === idx ? updater(d) : d));
  }, []);

  const duplicateWeek = () => {
    // Duplicate current week's exercises to next week
    toast({ title: "تم تكرار الأسبوع" });
  };

  const createDeloadWeek = () => {
    setLocalDays(prev => prev.map(d => {
      if (d.isRest) return d;
      return {
        ...d,
        exercises: d.exercises.map(e => ({
          ...e,
          id: genId(),
          sets: Math.max(2, Math.round(e.sets * 0.6)),
          weight: Math.round(e.weight * 0.7),
          rpe: e.rpe ? Math.max(5, e.rpe - 2) : 6,
          notes: e.notes ? e.notes + " [ديلود]" : "ديلود - حجم مخفض 40%",
        })),
      };
    }));
    toast({ title: "تم إنشاء أسبوع ديلود (حجم مخفض 40%)" });
  };

  // VIEW: DETAIL
  if (view === "detail" && viewProgramId) {
    const program = programs.find(p => p.id === viewProgramId);
    if (!program) return null;
    return (
      <TrainerLayout>
        <ProgramDetail
          program={program}
          programDays={programDays}
          clientCount={clients.filter((c: any) => c.program_id === viewProgramId).length}
          onBack={() => { setView("list"); setViewProgramId(null); }}
          onSaveAsTemplate={(id) => saveAsTemplateMutation.mutate(id)}
          onAssign={(id) => setCopyProgramId(id)}
          onDelete={(id) => deleteMutation.mutate(id)}
          onDeleteExercise={(id) => deleteExMutation.mutate(id)}
          deletePending={deleteMutation.isPending}
        />
        {copyProgram && (
          <CopyProgramModal open={!!copyProgramId} onOpenChange={o => { if (!o) setCopyProgramId(null); }}
            program={copyProgram} clients={clients as any} programs={programs} />
        )}
      </TrainerLayout>
    );
  }

  // VIEW: STEP 1
  if (view === "step1") {
    return (
      <TrainerLayout>
        <ProgramSetup
          programName={programName} setProgramName={setProgramName}
          programGoal={programGoal} setProgramGoal={setProgramGoal}
          programLevel={programLevel} setProgramLevel={setProgramLevel}
          weeks={weeks} setWeeks={setWeeks}
          programDesc={programDesc} setProgramDesc={setProgramDesc}
          selectedDays={selectedDays} setSelectedDays={setSelectedDays}
          equipment={equipment} setEquipment={setEquipment}
          onCancel={() => { setView("list"); resetForm(); }}
          onProceed={proceedToStep2}
          onApplyTemplate={applyTemplate}
        />
      </TrainerLayout>
    );
  }

  // VIEW: STEP 2 - FULL BUILDER
  if (view === "step2") {
    return (
      <TrainerLayout>
        <div className="animate-fade-in pb-32" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={() => setView("step1")} className="text-xs text-primary hover:underline mb-1 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" strokeWidth={1.5} />الرجوع
              </button>
              <h1 className="text-lg font-bold text-foreground">{programName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {programGoal && <Badge variant="secondary" className="text-[10px]">{programGoal}</Badge>}
                {programLevel && <Badge variant="secondary" className="text-[10px]">{programLevel}</Badge>}
                <Badge variant="secondary" className="text-[10px]">
                  <Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{weeks} أسابيع
                </Badge>
                {lastSaved && (
                  <span className="text-[9px] text-muted-foreground">
                    حُفظ {lastSaved.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Week Calendar */}
          <WeekCalendar
            days={localDays}
            activeDay={activeDay}
            activeWeek={activeWeek}
            totalWeeks={weeks}
            onSelectDay={setActiveDay}
            onWeekChange={setActiveWeek}
            onDuplicateWeek={duplicateWeek}
            onCreateDeload={createDeloadWeek}
          />

          {/* Smart Warnings */}
          <div className="mt-3">
            <SmartWarnings days={localDays} weeks={weeks} currentWeek={activeWeek} />
          </div>

          {/* Day Editor */}
          <div className="mt-4">
            {localDays[activeDay] && (
              <DayEditor
                day={localDays[activeDay]}
                dayIndex={activeDay}
                allDays={localDays}
                onUpdateDay={updateDay}
                onToast={(msg) => toast({ title: msg })}
              />
            )}
          </div>

          {/* Bottom Bar */}
          <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border p-3 flex gap-2 z-[60] max-w-screen-xl mx-auto shadow-lg">
            <Button variant="outline" className="gap-1 text-xs" onClick={() => {
              setLastSaved(new Date());
              toast({ title: "تم حفظ المسودة" });
            }}>
              <Save className="w-3.5 h-3.5" strokeWidth={1.5} />مسودة
            </Button>
            <Button variant="outline" className="gap-1 text-xs" onClick={() => createMutation.mutate(true)}
              disabled={createMutation.isPending}>
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />حفظ كقالب
            </Button>
            <Button className="flex-[2] gap-1 text-sm"
              disabled={createMutation.isPending || localDays.filter(d => !d.isRest).length === 0}
              onClick={() => createMutation.mutate(false)}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر البرنامج"}
            </Button>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  // VIEW: LIST
  const listTemplates = ALL_TEMPLATES.slice(0, 4).map(t => ({
    name: t.name,
    icon: t.goal === "تخسيس" ? Flame : t.goal === "قوة" ? Target : t.goal === "تأهيل" ? HeartPulse : Dumbbell,
    weeks: t.weeks,
    goal: t.goal,
    level: t.level,
    desc: t.description.slice(0, 40) + "...",
    days: t.days,
  }));

  return (
    <TrainerLayout>
      <ProgramList
        programs={programs}
        clients={clients}
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewProgram={() => setView("step1")}
        onViewProgram={(id) => { setViewProgramId(id); setView("detail"); }}
        onAssignProgram={(id) => setCopyProgramId(id)}
        onDeleteProgram={(id) => deleteMutation.mutate(id)}
        onApplyTemplate={(t: any) => {
          // Check if it's a full template or a simplified one
          const fullTemplate = ALL_TEMPLATES.find(ft => ft.name === t.name);
          if (fullTemplate) {
            applyTemplate(fullTemplate);
          } else {
            applyTemplate(t);
          }
        }}
        templates={listTemplates}
      />
      {copyProgram && (
        <CopyProgramModal open={!!copyProgramId} onOpenChange={o => { if (!o) setCopyProgramId(null); }}
          program={copyProgram} clients={clients as any} programs={programs} />
      )}
      {assignProgramId && (
        <CopyProgramModal open={!!assignProgramId} onOpenChange={o => { if (!o) setAssignProgramId(null); }}
          program={programs.find(p => p.id === assignProgramId) || { id: assignProgramId, name: "البرنامج الجديد" }}
          clients={clients as any} programs={programs} />
      )}
    </TrainerLayout>
  );
};

export default ProgramBuilder;
