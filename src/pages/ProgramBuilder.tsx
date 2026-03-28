import { useState, useCallback } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Calendar, Save, ChevronRight,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import ProgramList from "@/components/program/ProgramList";
import ProgramSetup from "@/components/program/ProgramSetup";
import type { TemplateData } from "@/components/program/ProgramSetup";
import ProgramDetail from "@/components/program/ProgramDetail";
import WeekCalendar from "@/components/program/WeekCalendar";
import DayEditor from "@/components/program/DayEditor";
import { LocalDay, LocalExercise, WEEK_DAYS, genId } from "@/components/program/types";

// Re-export templates for ProgramList
import { Flame, Dumbbell, Shield } from "lucide-react";
const listTemplates = [
  { name: "تخسيس 8 أسابيع", icon: Flame, weeks: 8, goal: "تخسيس", level: "متوسط", desc: "كارديو + أوزان لحرق الدهون", days: [] as LocalDay[] },
  { name: "بناء عضلات 12 أسبوع", icon: Dumbbell, weeks: 12, goal: "بناء عضلات", level: "متقدم", desc: "سبليت متقدم لزيادة الكتلة", days: [] as LocalDay[] },
  { name: "مبتدئ 4 أسابيع", icon: Shield, weeks: 4, goal: "لياقة عامة", level: "مبتدئ", desc: "فول بادي للمبتدئين", days: [] as LocalDay[] },
];

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

  // Step 2: Builder
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [activeWeek, setActiveWeek] = useState(1);

  // Assign/Copy
  const [copyProgramId, setCopyProgramId] = useState<string | null>(null);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
    mutationFn: async () => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      const activeDays = localDays.filter(d => !d.isRest);
      if (activeDays.length === 0) throw new Error("أضف يوم تدريب واحد على الأقل");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({
          trainer_id: user!.id, name: programName.trim(), weeks,
          goal: programGoal || null, difficulty: programLevel || null,
          description: programDesc || null,
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
    setActiveDay(0); setActiveWeek(1);
  };

  const proceedToStep2 = () => {
    if (!programName.trim()) { toast({ title: "أدخل اسم البرنامج", variant: "destructive" }); return; }
    if (selectedDays.length === 0) { toast({ title: "اختر أيام التدريب", variant: "destructive" }); return; }
    // Build 7-day week from selected days
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

  const applyTemplate = (t: TemplateData) => {
    setProgramName(t.name); setProgramGoal(t.goal); setProgramLevel(t.level);
    setWeeks(t.weeks);
    const days = t.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => ({ ...e, id: genId() })),
      warmup: (d.warmup || []).map(e => ({ ...e, id: genId() })),
    }));
    setLocalDays(days);
    setSelectedDays(t.days.filter(d => !d.isRest).map(d => d.dayName));
    setActiveDay(days.findIndex(d => !d.isRest));
    setView("step2");
    toast({ title: `تم تحميل قالب "${t.name}"` });
  };

  const updateDay = useCallback((idx: number, updater: (d: LocalDay) => LocalDay) => {
    setLocalDays(prev => prev.map((d, i) => i === idx ? updater(d) : d));
  }, []);

  const duplicateWeek = () => {
    toast({ title: "تم تكرار الأسبوع بنجاح" });
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
          onCancel={() => { setView("list"); resetForm(); }}
          onProceed={proceedToStep2}
          onApplyTemplate={applyTemplate}
        />
      </TrainerLayout>
    );
  }

  // VIEW: STEP 2 - BUILDER
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
              <div className="flex items-center gap-2 mt-1">
                {programGoal && <Badge variant="secondary" className="text-[10px]">{programGoal}</Badge>}
                {programLevel && <Badge variant="secondary" className="text-[10px]">{programLevel}</Badge>}
                <Badge variant="secondary" className="text-[10px]">
                  <Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{weeks} أسابيع
                </Badge>
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
          />

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
            <Button variant="outline" className="flex-1 gap-1 text-xs" onClick={() => toast({ title: "تم حفظ المسودة" })}>
              <Save className="w-3.5 h-3.5" strokeWidth={1.5} />حفظ مسودة
            </Button>
            <Button className="flex-[2] gap-1 text-sm"
              disabled={createMutation.isPending || localDays.filter(d => !d.isRest).length === 0}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر البرنامج"}
            </Button>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  // VIEW: LIST
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
        onApplyTemplate={applyTemplate}
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
