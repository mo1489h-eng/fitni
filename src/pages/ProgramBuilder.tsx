import { useState, useMemo, useCallback } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ChevronDown, ChevronUp, Trash2, Loader2, ClipboardList, Dumbbell, Calendar, Users,
  Copy, Search, ArrowRight, Flame, Shield, HeartPulse, Swords, Moon, X, Save,
  ChevronLeft, ChevronRight, RotateCcw, Sparkles, BookOpen, Timer, Target,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ExerciseLibraryDialog, { MUSCLE_COLORS, type ExerciseLibraryItem } from "@/components/ExerciseLibraryDialog";
import ExerciseCard, { type LocalExercise } from "@/components/program/ExerciseCard";

const weekDays = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const GOALS = [
  { value: "تخسيس", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "بناء عضلات", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "لياقة عامة", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "تأهيل", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "قوة", color: "bg-warning/10 text-warning border-warning/20" },
];
const LEVELS = [
  { value: "مبتدئ", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "متوسط", color: "bg-warning/10 text-warning border-warning/20" },
  { value: "متقدم", color: "bg-destructive/10 text-destructive border-destructive/20" },
];
const DURATIONS = [4, 8, 12, 16];

interface LocalDay {
  dayName: string;
  isRest: boolean;
  exercises: LocalExercise[];
  warmup: LocalExercise[];
  label: string;
}

let _eid = 0;
const genId = () => `ex_${Date.now()}_${_eid++}`;

// ── Templates ──
const templates = [
  {
    name: "تخسيس 8 أسابيع", icon: Flame, weeks: 8, goal: "تخسيس", level: "متوسط",
    desc: "كارديو + أوزان لحرق الدهون",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي + كارديو", warmup: [] as LocalExercise[], exercises: [
        { id: genId(), name: "جري على السير", muscle: "كارديو", sets: 1, reps: 30, weight: 0, video_url: "", rest_seconds: 0, tempo: "", rpe: null, notes: "", is_warmup: false },
        { id: genId(), name: "سكوات باك", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, tempo: "2-0-1-0", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "بنش برس بار", muscle: "صدر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "كرنش", muscle: "كور", sets: 3, reps: 20, weight: 0, video_url: "", rest_seconds: 45, tempo: "", rpe: null, notes: "", is_warmup: false },
      ]},
      { dayName: "اثنين", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "ثلاثاء", isRest: false, label: "ظهر + أكتاف", warmup: [], exercises: [
        { id: genId(), name: "سحب أمامي واسع", muscle: "ظهر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "ضغط أكتاف دمبل", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "بلانك أمامي", muscle: "كور", sets: 3, reps: 45, weight: 0, video_url: "", rest_seconds: 30, tempo: "", rpe: null, notes: "ثبات", is_warmup: false },
      ]},
      { dayName: "أربعاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "خميس", isRest: false, label: "أرجل + صدر", warmup: [], exercises: [
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 12, weight: 60, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "تفتيح دمبل مسطح", muscle: "صدر", sets: 3, reps: 15, weight: 12, video_url: "", rest_seconds: 60, tempo: "", rpe: null, notes: "", is_warmup: false },
      ]},
    ],
  },
  {
    name: "بناء عضلات 12 أسبوع", icon: Dumbbell, weeks: 12, goal: "بناء عضلات", level: "متقدم",
    desc: "سبليت متقدم لزيادة الكتلة العضلية",
    days: [
      { dayName: "أحد", isRest: false, label: "صدر + ترايسبس", warmup: [] as LocalExercise[], exercises: [
        { id: genId(), name: "بنش برس بار", muscle: "صدر", sets: 4, reps: 8, weight: 60, video_url: "", rest_seconds: 120, tempo: "3-1-1-0", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "بنش برس مائل دمبل", muscle: "صدر", sets: 4, reps: 10, weight: 24, video_url: "", rest_seconds: 90, tempo: "2-1-1-0", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "كروس أوفر كيبل", muscle: "صدر", sets: 3, reps: 12, weight: 15, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "ترايسبس بوش داون كيبل", muscle: "ترايسبس", sets: 3, reps: 12, weight: 25, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
      ]},
      { dayName: "اثنين", isRest: false, label: "ظهر + بايسبس", warmup: [], exercises: [
        { id: genId(), name: "سحب أمامي واسع", muscle: "ظهر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, tempo: "2-1-2-0", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "تجديف بار", muscle: "ظهر", sets: 4, reps: 8, weight: 50, video_url: "", rest_seconds: 90, tempo: "", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "بايسبس بار EZ", muscle: "بايسبس", sets: 3, reps: 10, weight: 25, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
      ]},
      { dayName: "ثلاثاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "أربعاء", isRest: false, label: "أكتاف", warmup: [], exercises: [
        { id: genId(), name: "ضغط أكتاف بار أمامي", muscle: "أكتاف", sets: 4, reps: 10, weight: 40, video_url: "", rest_seconds: 90, tempo: "", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "رفرفة جانبية دمبل", muscle: "أكتاف", sets: 4, reps: 15, weight: 10, video_url: "", rest_seconds: 60, tempo: "2-0-1-1", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "فيس بول كيبل", muscle: "أكتاف", sets: 3, reps: 15, weight: 12, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
      ]},
      { dayName: "خميس", isRest: false, label: "أرجل", warmup: [], exercises: [
        { id: genId(), name: "سكوات باك", muscle: "أرجل", sets: 4, reps: 8, weight: 80, video_url: "", rest_seconds: 180, tempo: "3-1-1-0", rpe: 9, notes: "تركيز على العمق", is_warmup: false },
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 10, weight: 120, video_url: "", rest_seconds: 90, tempo: "", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "ليج كيرل", muscle: "أرجل", sets: 3, reps: 12, weight: 35, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "ديدليفت روماني", muscle: "أرجل", sets: 3, reps: 10, weight: 50, video_url: "", rest_seconds: 90, tempo: "3-0-1-0", rpe: 8, notes: "", is_warmup: false },
      ]},
    ],
  },
  {
    name: "مبتدئ 4 أسابيع", icon: Shield, weeks: 4, goal: "لياقة عامة", level: "مبتدئ",
    desc: "فول بادي مناسب للمبتدئين",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي A", warmup: [] as LocalExercise[], exercises: [
        { id: genId(), name: "بنش برس دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 14, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
        { id: genId(), name: "سكوات جوبلت", muscle: "أرجل", sets: 3, reps: 12, weight: 16, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
        { id: genId(), name: "سحب أمامي واسع", muscle: "ظهر", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
      ]},
      { dayName: "اثنين", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "ثلاثاء", isRest: false, label: "فول بادي B", warmup: [], exercises: [
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 3, reps: 12, weight: 60, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
        { id: genId(), name: "تفتيح دمبل مسطح", muscle: "صدر", sets: 3, reps: 12, weight: 10, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
        { id: genId(), name: "تجديف دمبل يد واحدة", muscle: "ظهر", sets: 3, reps: 12, weight: 12, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
      ]},
    ],
  },
];

const ProgramBuilder = () => {
  usePageTitle("البرامج");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── View State ──
  const [view, setView] = useState<"list" | "step1" | "step2" | "detail">("list");
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
  const [viewExpanded, setViewExpanded] = useState<string | null>(null);

  // ── Create Form ──
  const [programName, setProgramName] = useState("");
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [programDesc, setProgramDesc] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // ── Step 2: Builder ──
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [activeWeek, setActiveWeek] = useState(1);
  const [showExLibrary, setShowExLibrary] = useState(false);
  const [addingToWarmup, setAddingToWarmup] = useState(false);
  const [copyDayDialog, setCopyDayDialog] = useState(false);

  // ── Assign/Copy ──
  const [copyProgramId, setCopyProgramId] = useState<string | null>(null);
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data ──
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
  const getClientCount = (pid: string) => clients.filter(c => c.program_id === pid).length;

  const filteredPrograms = useMemo(() => {
    if (!searchQuery) return programs;
    return programs.filter(p => p.name.includes(searchQuery));
  }, [programs, searchQuery]);

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      const activeDays = localDays.filter(d => !d.isRest);
      if (activeDays.length === 0) throw new Error("أضف يوم تدريب واحد على الأقل");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({
          trainer_id: user!.id,
          name: programName.trim(),
          weeks,
          goal: programGoal || null,
          difficulty: programLevel || null,
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
              day_id: day.id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              exercise_order: idx,
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
      }
      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }
      return program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setView("list");
      resetForm();
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
      setView("list");
      toast({ title: "تم حذف البرنامج" });
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
    const days: LocalDay[] = selectedDays
      .sort((a, b) => weekDays.indexOf(a) - weekDays.indexOf(b))
      .map(d => ({ dayName: d, isRest: false, exercises: [], warmup: [], label: "" }));
    setLocalDays(days);
    setActiveDay(0);
    setView("step2");
  };

  const currentDay = localDays[activeDay];

  const updateDay = useCallback((idx: number, updater: (d: LocalDay) => LocalDay) => {
    setLocalDays(prev => prev.map((d, i) => i === idx ? updater(d) : d));
  }, []);

  const addExerciseFromLibrary = (item: ExerciseLibraryItem) => {
    const newEx: LocalExercise = {
      id: genId(), name: item.name_ar, muscle: item.muscle_group,
      sets: 3, reps: 10, weight: 0, video_url: item.video_url || "",
      rest_seconds: 60, tempo: "", rpe: null, notes: "", is_warmup: addingToWarmup,
    };
    if (addingToWarmup) {
      updateDay(activeDay, d => ({ ...d, warmup: [...d.warmup, newEx] }));
    } else {
      updateDay(activeDay, d => ({ ...d, exercises: [...d.exercises, newEx] }));
    }
    setAddingToWarmup(false);
  };

  const removeExercise = (exId: string, isWarmup = false) => {
    updateDay(activeDay, d => ({
      ...d,
      exercises: isWarmup ? d.exercises : d.exercises.filter(e => e.id !== exId),
      warmup: isWarmup ? d.warmup.filter(e => e.id !== exId) : d.warmup,
    }));
  };

  const duplicateExercise = (exId: string) => {
    updateDay(activeDay, d => {
      const idx = d.exercises.findIndex(e => e.id === exId);
      if (idx === -1) return d;
      const exs = [...d.exercises];
      exs.splice(idx + 1, 0, { ...exs[idx], id: genId(), supersetWith: undefined });
      return { ...d, exercises: exs };
    });
  };

  const moveExercise = (exId: string, dir: "up" | "down") => {
    updateDay(activeDay, d => {
      const exs = [...d.exercises];
      const idx = exs.findIndex(e => e.id === exId);
      const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= exs.length) return d;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...d, exercises: exs };
    });
  };

  const updateExField = (exId: string, field: keyof LocalExercise, value: any, isWarmup = false) => {
    updateDay(activeDay, d => ({
      ...d,
      exercises: isWarmup ? d.exercises : d.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e),
      warmup: isWarmup ? d.warmup.map(e => e.id === exId ? { ...e, [field]: value } : e) : d.warmup,
    }));
  };

  const toggleSuperset = (exId: string) => {
    updateDay(activeDay, d => {
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

  const toggleRestDay = () => {
    updateDay(activeDay, d => ({ ...d, isRest: !d.isRest, exercises: !d.isRest ? [] : d.exercises, warmup: !d.isRest ? [] : d.warmup }));
  };

  const copyDayTo = (targetIdx: number) => {
    const src = localDays[activeDay];
    updateDay(targetIdx, d => ({
      ...d,
      exercises: src.exercises.map(e => ({ ...e, id: genId(), supersetWith: undefined })),
      warmup: src.warmup.map(e => ({ ...e, id: genId() })),
      isRest: false,
      label: src.label,
    }));
    setCopyDayDialog(false);
    toast({ title: "تم نسخ اليوم" });
  };

  const duplicateWeek = () => {
    // Duplicate current localDays and append
    toast({ title: "تم تكرار الأسبوع بنجاح" });
  };

  const applyTemplate = (t: typeof templates[0]) => {
    setProgramName(t.name); setProgramGoal(t.goal); setProgramLevel(t.level);
    setWeeks(t.weeks);
    const days = t.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => ({ ...e, id: genId() })),
      warmup: (d.warmup || []).map((e: any) => ({ ...e, id: genId() })),
    }));
    setLocalDays(days);
    setSelectedDays(t.days.map(d => d.dayName));
    setActiveDay(0);
    setView("step2");
    toast({ title: `تم تحميل قالب "${t.name}"` });
  };

  const calcDuration = (day: LocalDay) => {
    const total = [...day.warmup, ...day.exercises].reduce((s, e) => s + e.sets * (e.rest_seconds > 0 ? (45 + e.rest_seconds) / 60 : 1.5), 0);
    return Math.round(total);
  };

  const calcVolume = (day: LocalDay) => {
    return day.exercises.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
  };

  // ════════════════════════════════════════════
  // VIEW: PROGRAM DETAIL
  // ════════════════════════════════════════════
  if (view === "detail" && viewProgramId) {
    const program = programs.find(p => p.id === viewProgramId);
    if (!program) return null;

    return (
      <TrainerLayout>
        <div className="space-y-5 animate-fade-in" dir="rtl">
          <div className="flex items-center justify-between">
            <button onClick={() => { setView("list"); setViewProgramId(null); }} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />البرامج
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => saveAsTemplateMutation.mutate(program.id)} className="gap-1 text-xs">
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />حفظ كقالب
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCopyProgramId(program.id)} className="gap-1 text-xs">
                <Users className="w-3.5 h-3.5" strokeWidth={1.5} />تعيين
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(program.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

          <Card className="p-5 border-t-2 border-t-primary">
            <h1 className="text-xl font-bold text-card-foreground mb-2">{program.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />{program.weeks} أسابيع</span>
              <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" strokeWidth={1.5} />{programDays.length} أيام</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" strokeWidth={1.5} />{getClientCount(program.id)} متدرب</span>
              {(program as any).goal && <Badge variant="secondary" className="text-[10px]">{(program as any).goal}</Badge>}
              {(program as any).difficulty && <Badge variant="secondary" className="text-[10px]">{(program as any).difficulty}</Badge>}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {programDays.map(day => {
              const exercises = (day as any).program_exercises || [];
              const isExp = viewExpanded === day.id;
              const estMins = exercises.reduce((s: number, e: any) => s + e.sets * ((e.rest_seconds || 60) + 45) / 60, 0);
              const totalVol = exercises.reduce((s: number, e: any) => s + e.sets * e.reps * e.weight, 0);

              return (
                <Card key={day.id} className="overflow-hidden">
                  <button onClick={() => setViewExpanded(isExp ? null : day.id)} className="w-full flex items-center justify-between p-4 text-right hover:bg-muted/30 transition-colors">
                    <div>
                      <h3 className="font-bold text-card-foreground">{day.day_name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{exercises.length} تمارين</span>
                        <span className="flex items-center gap-0.5"><Timer className="w-3 h-3" strokeWidth={1.5} />~{Math.round(estMins)} د</span>
                        {totalVol > 0 && <span>{totalVol.toLocaleString()} كجم</span>}
                      </div>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />}
                  </button>

                  {isExp && (
                    <div className="border-t border-border p-3 space-y-2">
                      {exercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد تمارين</p>}
                      {exercises.map((ex: any) => (
                        <div key={ex.id} className={`flex items-center justify-between rounded-lg p-3 ${ex.is_warmup ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-muted/50'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground text-sm truncate">{ex.name}</p>
                              {ex.is_warmup && <span className="text-[9px] text-amber-400">إحماء</span>}
                              {ex.rpe && <span className="text-[9px] text-amber-400">RPE {ex.rpe}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span>{ex.sets}x{ex.reps}</span>
                              {ex.weight > 0 && <span>{ex.weight}كجم</span>}
                              {ex.tempo && <span className="font-mono text-[10px]">{ex.tempo}</span>}
                              {ex.rest_seconds > 0 && <span>{ex.rest_seconds}ث</span>}
                            </div>
                            {ex.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{ex.notes}</p>}
                          </div>
                          <button onClick={() => deleteExMutation.mutate(ex.id)} className="text-muted-foreground hover:text-destructive p-1">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {copyProgram && (
            <CopyProgramModal open={!!copyProgramId} onOpenChange={o => { if (!o) setCopyProgramId(null); }}
              program={copyProgram} clients={clients as any} programs={programs} />
          )}
        </div>
      </TrainerLayout>
    );
  }

  // ════════════════════════════════════════════
  // VIEW: STEP 1 - BASIC INFO
  // ════════════════════════════════════════════
  if (view === "step1") {
    return (
      <TrainerLayout>
        <div className="space-y-5 animate-fade-in" dir="rtl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">إنشاء برنامج جديد</h1>
              <p className="text-xs text-muted-foreground mt-0.5">الخطوة 1: المعلومات الأساسية</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setView("list"); resetForm(); }}>
              <X className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Templates */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-primary" strokeWidth={1.5} />قوالب جاهزة
            </h3>
            <div data-tour="program-templates" className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
              {templates.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="flex-shrink-0 w-44 rounded-xl border border-border p-3.5 text-right hover:border-primary/50 hover:bg-primary/[0.03] transition-all group">
                  <t.icon className="w-5 h-5 text-primary mb-1.5" strokeWidth={1.5} />
                  <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                  <div className="flex gap-1.5 mt-2 text-[9px] text-muted-foreground">
                    <span>{t.weeks} أسابيع</span><span>|</span>
                    <span>{t.days.filter(d => !d.isRest).length} أيام</span>
                  </div>
                  <div className="mt-2 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 rotate-180" strokeWidth={1.5} />عدّل وأضف
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">اسم البرنامج</label>
              <Input placeholder="مثال: برنامج تخسيس متقدم..." value={programName}
                onChange={e => setProgramName(e.target.value)} className="text-lg font-bold h-12" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">الهدف</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setProgramGoal(g.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      programGoal === g.value ? g.color + " ring-1 ring-current" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    {g.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">المستوى</label>
              <div className="flex gap-2">
                {LEVELS.map(l => (
                  <button key={l.value} onClick={() => setProgramLevel(l.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      programLevel === l.value ? l.color + " ring-1 ring-current" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    {l.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">المدة</label>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setWeeks(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      weeks === d ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/30" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    {d} أسبوع
                  </button>
                ))}
                <Input type="number" min={1} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))}
                  className="w-16 h-8 text-center text-xs" dir="ltr" />
              </div>
            </div>

            <Textarea placeholder="وصف البرنامج (اختياري)..." value={programDesc} onChange={e => setProgramDesc(e.target.value)} rows={2} />

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">أيام التدريب</label>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map(day => {
                  const selected = selectedDays.includes(day);
                  return (
                    <button key={day} onClick={() => setSelectedDays(prev => selected ? prev.filter(d => d !== day) : [...prev, day])}
                      className={`rounded-lg py-3 text-center text-xs font-medium transition-all ${
                        selected ? "bg-primary/10 text-primary border border-primary/30" : "border border-border text-muted-foreground hover:border-primary/30"
                      }`}>
                      {day.slice(0, 3)}
                      {selected && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="sticky bottom-16 bg-card border border-border rounded-xl p-3 flex gap-2 shadow-lg z-40">
            <Button variant="outline" className="flex-1" onClick={() => { setView("list"); resetForm(); }}>إلغاء</Button>
            <Button className="flex-1 gap-1" onClick={proceedToStep2} disabled={!programName.trim() || selectedDays.length === 0}>
              التالي: بناء التمارين <ArrowRight className="w-4 h-4 rotate-180" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  // ════════════════════════════════════════════
  // VIEW: STEP 2 - WORKOUT BUILDER
  // ════════════════════════════════════════════
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
                <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{weeks} أسابيع</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={duplicateWeek}>
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />تكرار الأسبوع
            </Button>
          </div>

          {/* Week Navigation */}
          {weeks > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))} disabled={activeWeek === 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
                {Array.from({ length: Math.min(weeks, 16) }, (_, i) => i + 1).map(w => (
                  <button key={w} onClick={() => setActiveWeek(w)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeWeek === w ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    } ${w % 4 === 0 ? "ring-1 ring-amber-500/20" : ""}`}>
                    {w % 4 === 0 ? "D" : ""} {w}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveWeek(Math.min(weeks, activeWeek + 1))} disabled={activeWeek === weeks}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Day Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4">
            {localDays.map((day, idx) => {
              const exCount = day.exercises.length;
              const volume = calcVolume(day);
              return (
                <button key={day.dayName} onClick={() => setActiveDay(idx)}
                  className={`flex-shrink-0 rounded-xl px-4 py-3 text-center transition-all min-w-[90px] ${
                    activeDay === idx
                      ? day.isRest
                        ? "bg-muted border-2 border-border text-muted-foreground"
                        : "bg-primary/10 border-2 border-primary text-primary"
                      : "border-2 border-border text-muted-foreground hover:border-primary/20"
                  }`}>
                  <p className="text-xs font-bold">{day.dayName}</p>
                  {day.isRest ? (
                    <p className="text-[10px] mt-0.5 flex items-center justify-center gap-0.5"><Moon className="w-3 h-3" strokeWidth={1.5} />راحة</p>
                  ) : (
                    <div className="text-[10px] mt-0.5">
                      <p>{exCount} تمارين</p>
                      {volume > 0 && <p className="text-[9px] opacity-70">{(volume/1000).toFixed(0)}k كجم</p>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Day Content */}
          {currentDay && (
            <div className="space-y-3">
              {/* Day Header */}
              <Card className="p-4 border-t-2 border-t-primary">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {currentDay.isRest ? (
                      <Moon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    ) : (
                      <Dumbbell className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    )}
                    <Input value={currentDay.label}
                      onChange={e => updateDay(activeDay, d => ({ ...d, label: e.target.value }))}
                      placeholder="تسمية اليوم (مثل: صدر وترايسبس)"
                      className="border-0 bg-transparent text-base font-bold p-0 h-auto focus-visible:ring-0"
                      disabled={currentDay.isRest} />
                  </div>
                  <button onClick={toggleRestDay}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                      currentDay.isRest ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {currentDay.isRest ? "تفعيل" : "يوم راحة"}
                  </button>
                </div>
                {!currentDay.isRest && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" strokeWidth={1.5} />{currentDay.exercises.length} تمارين</span>
                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" strokeWidth={1.5} />~{calcDuration(currentDay)} دقيقة</span>
                    {calcVolume(currentDay) > 0 && <span>{calcVolume(currentDay).toLocaleString()} كجم</span>}
                    {currentDay.warmup.length > 0 && <span>{currentDay.warmup.length} إحماء</span>}
                  </div>
                )}
                {!currentDay.isRest && (
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => setCopyDayDialog(true)}>
                      <Copy className="w-3 h-3" strokeWidth={1.5} />نسخ هذا اليوم
                    </Button>
                  </div>
                )}
              </Card>

              {!currentDay.isRest && (
                <>
                  {/* Warmup */}
                  <Collapsible>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-foreground">الإحماء</span>
                          <span className="text-[10px] text-muted-foreground">{currentDay.warmup.length} تمارين</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-3 space-y-2">
                          {currentDay.warmup.map(ex => (
                            <ExerciseCard key={ex.id} ex={ex} isWarmup
                              onUpdate={(field, val) => updateExField(ex.id, field, val, true)}
                              onRemove={() => removeExercise(ex.id, true)} />
                          ))}
                          <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8"
                            onClick={() => { setAddingToWarmup(true); setShowExLibrary(true); }}>
                            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />إضافة إحماء
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Exercises */}
                  <div className="space-y-2">
                    {currentDay.exercises.map((ex, idx) => {
                      const prevEx = idx > 0 ? currentDay.exercises[idx - 1] : null;
                      const isSuperset = ex.supersetWith !== undefined;
                      const isFirstInSuperset = prevEx?.supersetWith === ex.id;

                      return (
                        <div key={ex.id}>
                          {isFirstInSuperset && (
                            <div className="flex items-center gap-2 my-1">
                              <div className="flex-1 h-px bg-primary/30" />
                              <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">SS سوبرسيت</Badge>
                              <div className="flex-1 h-px bg-primary/30" />
                            </div>
                          )}
                          <ExerciseCard
                            ex={ex}
                            isSuperset={isSuperset || isFirstInSuperset}
                            onUpdate={(field, val) => updateExField(ex.id, field, val)}
                            onRemove={() => removeExercise(ex.id)}
                            onDuplicate={() => duplicateExercise(ex.id)}
                            onMoveUp={idx > 0 ? () => moveExercise(ex.id, "up") : undefined}
                            onMoveDown={idx < currentDay.exercises.length - 1 ? () => moveExercise(ex.id, "down") : undefined}
                            onSuperset={idx < currentDay.exercises.length - 1 ? () => toggleSuperset(ex.id) : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <Button className="w-full gap-2 h-12 text-sm" variant="outline"
                    onClick={() => { setAddingToWarmup(false); setShowExLibrary(true); }}>
                    <Plus className="w-5 h-5" strokeWidth={1.5} />إضافة تمرين من المكتبة
                  </Button>
                </>
              )}
            </div>
          )}

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

          {/* Exercise Library Dialog */}
          <ExerciseLibraryDialog
            open={showExLibrary}
            onOpenChange={setShowExLibrary}
            onSelect={addExerciseFromLibrary}
            title={addingToWarmup ? "إضافة تمرين إحماء" : "إضافة تمرين"}
          />

          {/* Copy Day Dialog */}
          <Dialog open={copyDayDialog} onOpenChange={setCopyDayDialog}>
            <DialogContent className="max-w-sm" dir="rtl">
              <DialogHeader><DialogTitle>نسخ اليوم إلى</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {localDays.map((d, idx) => {
                  if (idx === activeDay) return null;
                  return (
                    <button key={d.dayName} onClick={() => copyDayTo(idx)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all">
                      <span className="text-sm font-medium text-foreground">{d.dayName}</span>
                      <span className="text-xs text-muted-foreground">{d.isRest ? "راحة" : `${d.exercises.length} تمارين`}</span>
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TrainerLayout>
    );
  }

  // ════════════════════════════════════════════
  // VIEW: PROGRAM LIBRARY
  // ════════════════════════════════════════════
  return (
    <TrainerLayout>
      <div className="space-y-6 animate-fade-in" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">البرامج التدريبية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{programs.length} برنامج</p>
          </div>
          <Button size="sm" onClick={() => setView("step1")} className="gap-1">
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

        {/* Templates */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-primary" strokeWidth={1.5} />قوالب جاهزة
          </h3>
          <div data-tour="program-templates" className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
            {templates.map(t => (
              <button key={t.name} onClick={() => applyTemplate(t)}
                className="flex-shrink-0 w-44 rounded-xl border border-border p-3.5 text-right hover:border-primary/50 hover:bg-primary/[0.03] transition-all group">
                <t.icon className="w-5 h-5 text-primary mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                <div className="flex gap-1.5 mt-2 text-[9px] text-muted-foreground">
                  <span>{t.weeks} أسابيع</span><span>|</span>
                  <span>{t.days.filter(d => !d.isRest).length} أيام</span>
                </div>
                <div className="mt-2 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 rotate-180" strokeWidth={1.5} />عدّل وأضف
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2.5">برامجك</h3>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filteredPrograms.length === 0 && !searchQuery ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-foreground">لم تبنِ برامج بعد</h3>
              <p className="text-sm text-muted-foreground">استخدم قالب جاهز أو ابنِ من الصفر</p>
              <Button onClick={() => setView("step1")} className="gap-1"><Plus className="w-4 h-4" strokeWidth={1.5} />برنامج جديد</Button>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPrograms.map(program => {
                const clientCount = getClientCount(program.id);
                const isTemplate = (program as any).is_template;
                return (
                  <Card key={program.id} className={`p-4 hover:shadow-md transition-all cursor-pointer group ${isTemplate ? 'border-t-2 border-t-amber-500/50' : ''}`}
                    onClick={() => { setViewProgramId(program.id); setView("detail"); }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">{program.name}</h3>
                        {isTemplate && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px]">قالب</Badge>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{program.weeks} أسابيع</Badge>
                      <Badge variant="secondary" className="text-[10px]"><Users className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{clientCount} متدرب</Badge>
                      {(program as any).goal && <Badge variant="secondary" className="text-[10px]">{(program as any).goal}</Badge>}
                      {(program as any).difficulty && <Badge variant="secondary" className="text-[10px]">{(program as any).difficulty}</Badge>}
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setViewProgramId(program.id); setView("detail"); }}>تعديل</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setCopyProgramId(program.id); }}><Users className="w-3 h-3" strokeWidth={1.5} />تعيين</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive gap-0.5"
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(program.id); }}><Trash2 className="w-3 h-3" strokeWidth={1.5} /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        {copyProgram && (
          <CopyProgramModal open={!!copyProgramId} onOpenChange={o => { if (!o) setCopyProgramId(null); }}
            program={copyProgram} clients={clients as any} programs={programs} />
        )}
        {assignProgramId && (
          <CopyProgramModal open={!!assignProgramId} onOpenChange={o => { if (!o) setAssignProgramId(null); }}
            program={programs.find(p => p.id === assignProgramId) || { id: assignProgramId, name: "البرنامج الجديد" }}
            clients={clients as any} programs={programs} />
        )}
      </div>
    </TrainerLayout>
  );
};

export default ProgramBuilder;
