import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ChevronDown, ChevronUp, Trash2, Loader2, ClipboardList, Dumbbell, Calendar, Users, Video,
  Copy, CopyPlus, Search, ArrowRight, Flame, Shield, HeartPulse, Swords, Moon, Play, X,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ── Exercise Library ──
const exerciseLibrary = [
  { name: "بنش برس", muscle: "صدر" }, { name: "بنش برس مائل", muscle: "صدر" },
  { name: "تفتيح دمبل", muscle: "صدر" }, { name: "بوش أب", muscle: "صدر" }, { name: "ديبس", muscle: "صدر" },
  { name: "سكوات", muscle: "أرجل" }, { name: "سكوات أمامي", muscle: "أرجل" },
  { name: "ليج برس", muscle: "أرجل" }, { name: "ليج كيرل", muscle: "أرجل" },
  { name: "ليج اكستنشن", muscle: "أرجل" }, { name: "لانجز", muscle: "أرجل" },
  { name: "ديدليفت", muscle: "ظهر" }, { name: "ديدليفت روماني", muscle: "ظهر" },
  { name: "سحب أمامي", muscle: "ظهر" }, { name: "سحب خلفي", muscle: "ظهر" },
  { name: "تجديف بار", muscle: "ظهر" }, { name: "تجديف دمبل", muscle: "ظهر" },
  { name: "ضغط أكتاف", muscle: "أكتاف" }, { name: "رفرفة جانبية", muscle: "أكتاف" },
  { name: "رفرفة أمامية", muscle: "أكتاف" }, { name: "شرق", muscle: "أكتاف" },
  { name: "بايسبس كيرل", muscle: "ذراع" }, { name: "هامر كيرل", muscle: "ذراع" },
  { name: "بايسبس بار", muscle: "ذراع" }, { name: "ترايسبس بوش داون", muscle: "ذراع" },
  { name: "فرنش برس", muscle: "ذراع" }, { name: "ديبس ترايسبس", muscle: "ذراع" },
  { name: "كرنش", muscle: "بطن" }, { name: "بلانك", muscle: "بطن" },
  { name: "ليج ريز", muscle: "بطن" }, { name: "روسيان تويست", muscle: "بطن" },
  { name: "كارديو - مشي", muscle: "كارديو" }, { name: "كارديو - جري", muscle: "كارديو" },
  { name: "كارديو - دراجة", muscle: "كارديو" },
];

const MUSCLE_ICONS: Record<string, string> = {
  "صدر": "🫁", "أرجل": "🦵", "ظهر": "🔙", "أكتاف": "💪",
  "ذراع": "💪", "بطن": "🎯", "كارديو": "🏃",
};

const weekDays = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const GOALS = [
  { value: "تخسيس", icon: "🔥", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { value: "بناء عضلات", icon: "💪", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "لياقة عامة", icon: "🏃", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "تأهيل", icon: "🩺", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { value: "قوة", icon: "⚡", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
];
const LEVELS = [
  { value: "مبتدئ", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "متوسط", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  { value: "متقدم", color: "bg-destructive/10 text-destructive border-destructive/20" },
];
const DURATIONS = [4, 8, 12, 16];

interface LocalExercise {
  name: string; muscle: string; sets: number; reps: number; weight: number;
  video_url: string; rest_seconds: number; notes: string;
}

interface LocalDay {
  dayName: string; isRest: boolean; exercises: LocalExercise[];
}

// ── Templates ──
const templates = [
  {
    name: "تخسيس 8 أسابيع", icon: Flame, weeks: 8, goal: "تخسيس", level: "متوسط",
    desc: "كارديو + أوزان لحرق الدهون",
    days: [
      { dayName: "أحد", isRest: false, exercises: [
        { name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 30, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { name: "سكوات", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { name: "بنش برس", muscle: "صدر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { name: "كرنش", muscle: "بطن", sets: 3, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "اثنين", isRest: true, exercises: [] },
      { dayName: "ثلاثاء", isRest: false, exercises: [
        { name: "كارديو - دراجة", muscle: "كارديو", sets: 1, reps: 20, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, notes: "" },
        { name: "بلانك", muscle: "بطن", sets: 3, reps: 45, weight: 0, video_url: "", rest_seconds: 30, notes: "" },
      ]},
      { dayName: "أربعاء", isRest: true, exercises: [] },
      { dayName: "خميس", isRest: false, exercises: [
        { name: "ليج برس", muscle: "أرجل", sets: 4, reps: 12, weight: 60, video_url: "", rest_seconds: 60, notes: "" },
        { name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 15, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
        { name: "تجديف دمبل", muscle: "ظهر", sets: 3, reps: 12, weight: 15, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ليج ريز", muscle: "بطن", sets: 3, reps: 15, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
    ],
  },
  {
    name: "بناء عضلات 12 أسبوع", icon: Dumbbell, weeks: 12, goal: "بناء عضلات", level: "متقدم",
    desc: "سبليت متقدم لزيادة الكتلة العضلية",
    days: [
      { dayName: "أحد", isRest: false, exercises: [
        { name: "بنش برس", muscle: "صدر", sets: 4, reps: 8, weight: 60, video_url: "", rest_seconds: 90, notes: "" },
        { name: "بنش برس مائل", muscle: "صدر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 16, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ترايسبس بوش داون", muscle: "ذراع", sets: 3, reps: 12, weight: 25, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, exercises: [
        { name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { name: "تجديف بار", muscle: "ظهر", sets: 4, reps: 8, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { name: "بايسبس بار", muscle: "ذراع", sets: 3, reps: 10, weight: 25, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, exercises: [] },
      { dayName: "أربعاء", isRest: false, exercises: [
        { name: "ضغط أكتاف", muscle: "أكتاف", sets: 4, reps: 10, weight: 40, video_url: "", rest_seconds: 90, notes: "" },
        { name: "رفرفة جانبية", muscle: "أكتاف", sets: 4, reps: 15, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { name: "شرق", muscle: "أكتاف", sets: 4, reps: 15, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "خميس", isRest: false, exercises: [
        { name: "سكوات", muscle: "أرجل", sets: 4, reps: 8, weight: 80, video_url: "", rest_seconds: 120, notes: "" },
        { name: "ليج برس", muscle: "أرجل", sets: 4, reps: 10, weight: 120, video_url: "", rest_seconds: 90, notes: "" },
        { name: "ليج كيرل", muscle: "أرجل", sets: 3, reps: 12, weight: 35, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ديدليفت روماني", muscle: "أرجل", sets: 3, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
      ]},
    ],
  },
  {
    name: "مبتدئ 4 أسابيع", icon: Shield, weeks: 4, goal: "لياقة عامة", level: "مبتدئ",
    desc: "فول بادي مناسب للمبتدئين",
    days: [
      { dayName: "أحد", isRest: false, exercises: [
        { name: "بنش برس", muscle: "صدر", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { name: "سكوات", muscle: "أرجل", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { name: "سحب أمامي", muscle: "ظهر", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { name: "كرنش", muscle: "بطن", sets: 3, reps: 15, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "اثنين", isRest: true, exercises: [] },
      { dayName: "ثلاثاء", isRest: false, exercises: [
        { name: "ليج برس", muscle: "أرجل", sets: 3, reps: 12, weight: 60, video_url: "", rest_seconds: 60, notes: "" },
        { name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { name: "تجديف دمبل", muscle: "ظهر", sets: 3, reps: 12, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
        { name: "بلانك", muscle: "بطن", sets: 3, reps: 30, weight: 0, video_url: "", rest_seconds: 30, notes: "" },
      ]},
      { dayName: "أربعاء", isRest: true, exercises: [] },
      { dayName: "خميس", isRest: false, exercises: [
        { name: "بوش أب", muscle: "صدر", sets: 3, reps: 10, weight: 0, video_url: "", rest_seconds: 60, notes: "" },
        { name: "لانجز", muscle: "أرجل", sets: 3, reps: 10, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { name: "رفرفة جانبية", muscle: "أكتاف", sets: 3, reps: 15, weight: 6, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ليج ريز", muscle: "بطن", sets: 3, reps: 12, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
    ],
  },
  {
    name: "لياقة 6 أسابيع", icon: HeartPulse, weeks: 6, goal: "لياقة عامة", level: "متوسط",
    desc: "تدريب وظيفي لتحسين اللياقة",
    days: [
      { dayName: "أحد", isRest: false, exercises: [
        { name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 20, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { name: "سكوات", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { name: "بوش أب", muscle: "صدر", sets: 4, reps: 12, weight: 0, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, exercises: [
        { name: "ديدليفت", muscle: "ظهر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { name: "سحب أمامي", muscle: "ظهر", sets: 3, reps: 12, weight: 35, video_url: "", rest_seconds: 60, notes: "" },
        { name: "روسيان تويست", muscle: "بطن", sets: 3, reps: 20, weight: 5, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, exercises: [] },
      { dayName: "أربعاء", isRest: false, exercises: [
        { name: "لانجز", muscle: "أرجل", sets: 4, reps: 12, weight: 15, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, notes: "" },
        { name: "كرنش", muscle: "بطن", sets: 4, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "خميس", isRest: false, exercises: [
        { name: "بنش برس", muscle: "صدر", sets: 3, reps: 12, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { name: "سكوات أمامي", muscle: "أرجل", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { name: "ليج ريز", muscle: "بطن", sets: 3, reps: 15, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
    ],
  },
  {
    name: "قتالي 8 أسابيع", icon: Swords, weeks: 8, goal: "قوة", level: "متقدم",
    desc: "قوة + كارديو للرياضات القتالية",
    days: [
      { dayName: "أحد", isRest: false, exercises: [
        { name: "ديدليفت", muscle: "ظهر", sets: 4, reps: 6, weight: 80, video_url: "", rest_seconds: 120, notes: "" },
        { name: "سكوات", muscle: "أرجل", sets: 4, reps: 8, weight: 70, video_url: "", rest_seconds: 120, notes: "" },
        { name: "بلانك", muscle: "بطن", sets: 3, reps: 60, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, exercises: [
        { name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 25, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { name: "بوش أب", muscle: "صدر", sets: 4, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
        { name: "روسيان تويست", muscle: "بطن", sets: 4, reps: 25, weight: 8, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, exercises: [] },
      { dayName: "أربعاء", isRest: false, exercises: [
        { name: "بنش برس", muscle: "صدر", sets: 4, reps: 8, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 10, weight: 45, video_url: "", rest_seconds: 90, notes: "" },
        { name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 10, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "خميس", isRest: false, exercises: [
        { name: "ديدليفت روماني", muscle: "ظهر", sets: 4, reps: 8, weight: 60, video_url: "", rest_seconds: 90, notes: "" },
        { name: "تجديف بار", muscle: "ظهر", sets: 4, reps: 10, weight: 45, video_url: "", rest_seconds: 90, notes: "" },
        { name: "بايسبس بار", muscle: "ذراع", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, notes: "" },
      ]},
    ],
  },
];

const ProgramBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── View State ──
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
  const [viewExpanded, setViewExpanded] = useState<string | null>(null);
  const [addExDay, setAddExDay] = useState<string | null>(null);

  // ── Create Form ──
  const [programName, setProgramName] = useState("");
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [programDesc, setProgramDesc] = useState("");
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);

  // ── Exercise Add Form ──
  const [exSearch, setExSearch] = useState("");
  const [newExName, setNewExName] = useState("");
  const [newExMuscle, setNewExMuscle] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("10");
  const [newExWeight, setNewExWeight] = useState("0");
  const [newExRest, setNewExRest] = useState("60");
  const [newExVideo, setNewExVideo] = useState("");
  const [newExNotes, setNewExNotes] = useState("");

  // ── Assign/Copy ──
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);
  const [copyProgramId, setCopyProgramId] = useState<string | null>(null);

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
    queryKey: ["clients"],
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

  const filteredLibrary = useMemo(() => {
    if (!exSearch) return exerciseLibrary;
    return exerciseLibrary.filter(e => e.name.includes(exSearch) || e.muscle.includes(exSearch));
  }, [exSearch]);

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      const activeDays = localDays.filter(d => !d.isRest);
      if (activeDays.length === 0) throw new Error("أضف يوم تدريب واحد على الأقل");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: user!.id, name: programName.trim(), weeks })
        .select().single();
      if (pErr) throw pErr;

      const daysToInsert = localDays.filter(d => !d.isRest).map((d, i) => ({
        program_id: program.id, day_name: d.dayName, day_order: i,
      }));
      const { data: days, error: dErr } = await supabase.from("program_days").insert(daysToInsert).select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      for (const day of days!) {
        const localDay = localDays.find(d => d.dayName === day.day_name);
        if (localDay) {
          localDay.exercises.forEach((ex, idx) => {
            exercisesToInsert.push({
              day_id: day.id, name: ex.name, sets: ex.sets, reps: ex.reps,
              weight: ex.weight, exercise_order: idx, video_url: ex.video_url || null,
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
      toast({ title: "تم إنشاء البرنامج بنجاح 🎉" });
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

  const addExMutation = useMutation({
    mutationFn: async ({ dayId, ex }: { dayId: string; ex: LocalExercise }) => {
      await supabase.from("program_exercises").insert({
        day_id: dayId, name: ex.name, sets: ex.sets, reps: ex.reps,
        weight: ex.weight, video_url: ex.video_url || null,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-days", viewProgramId] });
      setAddExDay(null); resetExForm();
    },
  });

  const resetForm = () => {
    setProgramName(""); setProgramGoal(""); setProgramLevel("");
    setWeeks(8); setProgramDesc(""); setLocalDays([]);
  };

  const resetExForm = () => {
    setNewExName(""); setNewExMuscle(""); setNewExSets("3"); setNewExReps("10");
    setNewExWeight("0"); setNewExRest("60"); setNewExVideo(""); setNewExNotes(""); setExSearch("");
  };

  const selectExFromLibrary = (ex: typeof exerciseLibrary[0]) => {
    setNewExName(ex.name); setNewExMuscle(ex.muscle); setExSearch("");
  };

  // ── Local Day Helpers ──
  const toggleDayInCreate = (dayName: string) => {
    setLocalDays(prev => {
      const exists = prev.find(d => d.dayName === dayName);
      if (exists) return prev.filter(d => d.dayName !== dayName);
      return [...prev, { dayName, isRest: false, exercises: [] }].sort(
        (a, b) => weekDays.indexOf(a.dayName) - weekDays.indexOf(b.dayName)
      );
    });
  };

  const toggleRest = (dayName: string) => {
    setLocalDays(prev => prev.map(d => d.dayName === dayName ? { ...d, isRest: !d.isRest, exercises: !d.isRest ? [] : d.exercises } : d));
  };

  const addExToLocalDay = (dayName: string) => {
    if (!newExName) return;
    setLocalDays(prev => prev.map(d => {
      if (d.dayName !== dayName) return d;
      return { ...d, exercises: [...d.exercises, {
        name: newExName, muscle: newExMuscle, sets: Number(newExSets) || 3,
        reps: Number(newExReps) || 10, weight: Number(newExWeight) || 0,
        video_url: newExVideo, rest_seconds: Number(newExRest) || 60, notes: newExNotes,
      }]};
    }));
    resetExForm();
  };

  const removeExFromLocalDay = (dayName: string, idx: number) => {
    setLocalDays(prev => prev.map(d => d.dayName === dayName ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d));
  };

  const duplicateExLocal = (dayName: string, idx: number) => {
    setLocalDays(prev => prev.map(d => {
      if (d.dayName !== dayName) return d;
      const exs = [...d.exercises]; exs.splice(idx + 1, 0, { ...exs[idx] });
      return { ...d, exercises: exs };
    }));
  };

  const moveExLocal = (dayName: string, idx: number, dir: "up" | "down") => {
    setLocalDays(prev => prev.map(d => {
      if (d.dayName !== dayName) return d;
      const exs = [...d.exercises];
      const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= exs.length) return d;
      [exs[idx], exs[t]] = [exs[t], exs[idx]];
      return { ...d, exercises: exs };
    }));
  };

  const copyDayTo = (fromDay: string, toDay: string) => {
    setLocalDays(prev => {
      const src = prev.find(d => d.dayName === fromDay);
      if (!src) return prev;
      return prev.map(d => d.dayName === toDay ? { ...d, exercises: [...src.exercises], isRest: false } : d);
    });
    toast({ title: `تم نسخ تمارين ${fromDay} إلى ${toDay}` });
  };

  const applyTemplate = (t: typeof templates[0]) => {
    setProgramName(t.name); setProgramGoal(t.goal); setProgramLevel(t.level);
    setWeeks(t.weeks); setLocalDays(t.days.map(d => ({ ...d })));
    toast({ title: `تم تحميل قالب "${t.name}" ✅` });
  };

  const getGoalBadge = (goal: string) => GOALS.find(g => g.value === goal);
  const getLevelBadge = (level: string) => LEVELS.find(l => l.value === level);

  // ── Exercise Search Dialog ──
  const [showExSearch, setShowExSearch] = useState<string | null>(null);
  const [expandedCreateDay, setExpandedCreateDay] = useState<string | null>(null);
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null);

  // ════════════════════════════════════════════
  // VIEW: PROGRAM DETAIL
  // ════════════════════════════════════════════
  if (view === "detail" && viewProgramId) {
    const program = programs.find(p => p.id === viewProgramId);
    if (!program) return null;

    return (
      <TrainerLayout>
        <div className="space-y-4 animate-fade-in" dir="rtl">
          <div className="flex items-center justify-between">
            <button onClick={() => { setView("list"); setViewProgramId(null); }} className="text-sm text-primary hover:underline font-medium">
              ← العودة للبرامج
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCopyProgramId(program.id)} className="gap-1">
                <Users className="w-3.5 h-3.5" />تعيين
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(program.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <Card className="p-5">
            <h1 className="text-xl font-bold text-card-foreground mb-2">{program.name}</h1>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{program.weeks} أسابيع</span>
              <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" />{programDays.length} أيام</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{getClientCount(program.id)} متدرب</span>
            </div>
          </Card>

          {/* Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {programDays.map(day => {
              const exercises = (day as any).program_exercises || [];
              const isExp = viewExpanded === day.id;
              const estMins = exercises.reduce((s: number, e: any) => s + e.sets * 2, 0);

              return (
                <Card key={day.id} className="overflow-hidden">
                  <button onClick={() => setViewExpanded(isExp ? null : day.id)} className="w-full flex items-center justify-between p-4 text-right hover:bg-muted/30 transition-colors">
                    <div>
                      <h3 className="font-bold text-card-foreground">{day.day_name}</h3>
                      <p className="text-xs text-muted-foreground">{exercises.length} تمارين • ~{estMins} دقيقة</p>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExp && (
                    <div className="border-t border-border p-3 space-y-2">
                      {exercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد تمارين</p>}
                      {exercises.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {ex.name}
                              {ex.video_url && (
                                <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex mr-1.5 text-primary hover:text-primary/80">
                                  <Video className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{ex.sets}×{ex.reps} {ex.weight > 0 && `• ${ex.weight}كجم`}</p>
                          </div>
                          <button onClick={() => deleteExMutation.mutate(ex.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {addExDay === day.id ? (
                        <ExerciseAddForm
                          exSearch={exSearch} setExSearch={setExSearch}
                          filteredLibrary={filteredLibrary}
                          selectEx={selectExFromLibrary}
                          newExName={newExName} newExSets={newExSets} newExReps={newExReps}
                          newExWeight={newExWeight} newExRest={newExRest} newExVideo={newExVideo}
                          setNewExSets={setNewExSets} setNewExReps={setNewExReps}
                          setNewExWeight={setNewExWeight} setNewExRest={setNewExRest} setNewExVideo={setNewExVideo}
                          onSave={() => addExMutation.mutate({
                            dayId: day.id,
                            ex: { name: newExName, muscle: "", sets: Number(newExSets), reps: Number(newExReps), weight: Number(newExWeight), video_url: newExVideo, rest_seconds: Number(newExRest), notes: "" },
                          })}
                          onCancel={() => { setAddExDay(null); resetExForm(); }}
                          saving={addExMutation.isPending}
                        />
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setAddExDay(day.id)}>
                          <Plus className="w-3.5 h-3.5" />إضافة تمرين
                        </Button>
                      )}
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
  // VIEW: CREATE PROGRAM
  // ════════════════════════════════════════════
  if (view === "create") {
    // expandedCreateDay and copyFromDay are declared at top level

    return (
      <TrainerLayout>
        <div className="space-y-5 animate-fade-in" dir="rtl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">إنشاء برنامج جديد</h1>
            <Button variant="ghost" size="sm" onClick={() => { setView("list"); resetForm(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Templates Horizontal Scroll */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">⚡ قوالب جاهزة</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {templates.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="flex-shrink-0 w-36 rounded-xl border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <t.icon className="w-5 h-5 text-primary mb-1" />
                  <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Program Name */}
          <Input
            placeholder="اسم البرنامج..."
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            className="text-lg font-bold h-12"
          />

          {/* Goal Chips */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">🎯 الهدف</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setProgramGoal(g.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    programGoal === g.value ? g.color + " ring-1 ring-current" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}>
                  {g.icon} {g.value}
                </button>
              ))}
            </div>
          </div>

          {/* Level Chips */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">📊 المستوى</label>
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

          {/* Duration Chips */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">⏱️ المدة</label>
            <div className="flex gap-2">
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

          {/* Description */}
          <Textarea placeholder="📝 وصف البرنامج (اختياري)..." value={programDesc} onChange={e => setProgramDesc(e.target.value)} rows={2} />

          {/* Days Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">أيام التدريب</label>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(day => {
                const selected = localDays.some(d => d.dayName === day);
                const isRest = localDays.find(d => d.dayName === day)?.isRest;
                return (
                  <button key={day} onClick={() => toggleDayInCreate(day)}
                    className={`rounded-lg py-2 text-center text-xs font-medium transition-all ${
                      selected
                        ? isRest ? "bg-muted text-muted-foreground border border-border" : "bg-primary/10 text-primary border border-primary/30"
                        : "border border-border text-muted-foreground hover:border-primary/30"
                    }`}>
                    {day.slice(0, 3)}
                    {selected && <p className="text-[9px] mt-0.5">{isRest ? "😴" : "💪"}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Cards */}
          {localDays.length > 0 && (
            <div className="space-y-3">
              {localDays.map(day => {
                const isExp = expandedCreateDay === day.dayName;
                const estMins = day.exercises.reduce((s, e) => s + e.sets * 2, 0);

                return (
                  <Card key={day.dayName} className={`overflow-hidden ${day.isRest ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between p-3">
                      <button onClick={() => !day.isRest && setExpandedCreateDay(isExp ? null : day.dayName)} className="flex-1 text-right">
                        <div className="flex items-center gap-2">
                          {day.isRest ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Dumbbell className="w-4 h-4 text-primary" />}
                          <h3 className="font-bold text-sm text-card-foreground">{day.dayName}</h3>
                          {!day.isRest && <span className="text-[10px] text-muted-foreground">{day.exercises.length} تمارين • ~{estMins} د</span>}
                          {day.isRest && <span className="text-[10px] text-muted-foreground">يوم راحة</span>}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleRest(day.dayName)}
                          className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${day.isRest ? "bg-muted border-border text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                          {day.isRest ? "تفعيل" : "😴 راحة"}
                        </button>
                        {!day.isRest && (
                          <button onClick={() => setExpandedCreateDay(isExp ? null : day.dayName)}>
                            {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExp && !day.isRest && (
                      <div className="border-t border-border p-3 space-y-2">
                        {/* Copy Day */}
                        {localDays.filter(d => d.dayName !== day.dayName && !d.isRest && d.exercises.length > 0).length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground py-1">نسخ من:</span>
                            {localDays.filter(d => d.dayName !== day.dayName && !d.isRest && d.exercises.length > 0).map(d => (
                              <button key={d.dayName} onClick={() => copyDayTo(d.dayName, day.dayName)}
                                className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                                <Copy className="w-2.5 h-2.5 inline ml-0.5" />{d.dayName}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Exercise List */}
                        {day.exercises.map((ex, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2.5">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveExLocal(day.dayName, idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button onClick={() => moveExLocal(day.dayName, idx, "down")} disabled={idx === day.exercises.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {MUSCLE_ICONS[ex.muscle] || "💪"} {ex.name}
                                {ex.video_url && <Video className="w-3 h-3 inline mr-1 text-primary" />}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {ex.sets}×{ex.reps} {ex.weight > 0 && `• ${ex.weight}كجم`} {ex.rest_seconds > 0 && `• راحة ${ex.rest_seconds}ث`}
                              </p>
                              {ex.notes && <p className="text-[9px] text-muted-foreground">{ex.notes}</p>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => duplicateExLocal(day.dayName, idx)} className="text-muted-foreground hover:text-primary"><CopyPlus className="w-3 h-3" /></button>
                              <button onClick={() => removeExFromLocalDay(day.dayName, idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}

                        {/* Add Exercise */}
                        <ExerciseAddForm
                          exSearch={exSearch} setExSearch={setExSearch}
                          filteredLibrary={filteredLibrary}
                          selectEx={selectExFromLibrary}
                          newExName={newExName} newExSets={newExSets} newExReps={newExReps}
                          newExWeight={newExWeight} newExRest={newExRest} newExVideo={newExVideo}
                          setNewExSets={setNewExSets} setNewExReps={setNewExReps}
                          setNewExWeight={setNewExWeight} setNewExRest={setNewExRest} setNewExVideo={setNewExVideo}
                          onSave={() => addExToLocalDay(day.dayName)}
                          onCancel={() => resetExForm()}
                          saving={false}
                          inline
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Save Bar */}
          <div className="sticky bottom-16 bg-card border border-border rounded-xl p-3 flex gap-2 shadow-lg z-40">
            <Button variant="outline" className="flex-1" onClick={() => { setView("list"); resetForm(); }}>
              إلغاء
            </Button>
            <Button
              className="flex-1 gap-1"
              disabled={createMutation.isPending || !programName.trim() || localDays.filter(d => !d.isRest).length === 0}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>حفظ البرنامج ✅</>}
            </Button>
          </div>
        </div>
      </TrainerLayout>
    );
  }

  // ════════════════════════════════════════════
  // VIEW: PROGRAM LIBRARY
  // ════════════════════════════════════════════
  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">البرامج التدريبية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{programs.length} برنامج</p>
          </div>
          <Button size="sm" onClick={() => setView("create")} className="gap-1">
            <Plus className="w-4 h-4" />برنامج جديد
          </Button>
        </div>

        {/* Templates */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-primary" />
            قوالب جاهزة
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {templates.map(t => (
              <TemplateCard key={t.name} template={t} userId={user?.id} />
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">برامجك</h3>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : programs.length === 0 ? (
            <Card className="p-10 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium text-foreground mb-1">لا توجد برامج</p>
              <p className="text-sm text-muted-foreground mb-4">أنشئ برنامج أو استخدم قالب جاهز</p>
              <Button onClick={() => setView("create")} className="gap-1"><Plus className="w-4 h-4" />إنشاء برنامج</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {programs.map(program => {
                const clientCount = getClientCount(program.id);
                return (
                  <Card key={program.id} className="p-4 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => { setViewProgramId(program.id); setView("detail"); }}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">{program.name}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="text-[10px]">
                        <Calendar className="w-3 h-3 ml-0.5" />{program.weeks} أسابيع
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        <Users className="w-3 h-3 ml-0.5" />{clientCount} متدرب
                      </Badge>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setViewProgramId(program.id); setView("detail"); }}>
                        تعديل
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setCopyProgramId(program.id); }}>
                        <Users className="w-3 h-3" />تعيين
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive gap-0.5"
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(program.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
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

// ── Template Card Component ──
const TemplateCard = ({ template, userId }: { template: typeof templates[0]; userId?: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const useTemplate = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: userId, name: template.name, weeks: template.weeks })
        .select().single();
      if (pErr) throw pErr;

      const daysToInsert = template.days.filter(d => !d.isRest).map((d, i) => ({
        program_id: program.id, day_name: d.dayName, day_order: i,
      }));
      const { data: days, error: dErr } = await supabase.from("program_days").insert(daysToInsert).select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      for (const day of days!) {
        const td = template.days.find(d => d.dayName === day.day_name);
        if (td) {
          td.exercises.forEach((ex, idx) => {
            exercisesToInsert.push({
              day_id: day.id, name: ex.name, sets: ex.sets, reps: ex.reps,
              weight: ex.weight, exercise_order: idx,
            });
          });
        }
      }
      if (exercisesToInsert.length > 0) {
        await supabase.from("program_exercises").insert(exercisesToInsert);
      }
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: `تم إضافة "${template.name}" لبرامجك ✅` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <button onClick={useTemplate} disabled={loading}
      className="flex-shrink-0 w-40 rounded-xl border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50">
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary mb-1" /> : <template.icon className="w-5 h-5 text-primary mb-1" />}
      <p className="text-xs font-bold text-foreground leading-tight">{template.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{template.desc}</p>
      <div className="flex gap-1.5 mt-1.5 text-[9px] text-muted-foreground">
        <span>{template.weeks} أسابيع</span>
        <span>•</span>
        <span>{template.days.filter(d => !d.isRest).length} أيام</span>
      </div>
    </button>
  );
};

// ── Exercise Add Form Component ──
const ExerciseAddForm = ({
  exSearch, setExSearch, filteredLibrary, selectEx,
  newExName, newExSets, newExReps, newExWeight, newExRest, newExVideo,
  setNewExSets, setNewExReps, setNewExWeight, setNewExRest, setNewExVideo,
  onSave, onCancel, saving, inline,
}: {
  exSearch: string; setExSearch: (v: string) => void;
  filteredLibrary: typeof exerciseLibrary;
  selectEx: (ex: typeof exerciseLibrary[0]) => void;
  newExName: string; newExSets: string; newExReps: string; newExWeight: string; newExRest: string; newExVideo: string;
  setNewExSets: (v: string) => void; setNewExReps: (v: string) => void;
  setNewExWeight: (v: string) => void; setNewExRest: (v: string) => void; setNewExVideo: (v: string) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; inline?: boolean;
}) => (
  <div className={`space-y-2 ${inline ? "pt-2 border-t border-border" : ""}`}>
    {/* Search */}
    <div className="relative">
      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="🔍 ابحث عن تمرين..." value={exSearch} onChange={e => setExSearch(e.target.value)} className="pr-10 text-sm" />
    </div>

    {/* Results */}
    {exSearch && (
      <div className="max-h-32 overflow-y-auto space-y-0.5 rounded-lg border border-border p-1">
        {filteredLibrary.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">لا نتائج</p>
        ) : (
          filteredLibrary.slice(0, 10).map(ex => (
            <button key={ex.name} onClick={() => selectEx(ex)}
              className="w-full text-right flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <span className="text-sm">{MUSCLE_ICONS[ex.muscle] || "💪"}</span>
              <div>
                <p className="text-xs font-medium text-foreground">{ex.name}</p>
                <p className="text-[10px] text-muted-foreground">{ex.muscle}</p>
              </div>
            </button>
          ))
        )}
      </div>
    )}

    {/* Selected Exercise */}
    {newExName && (
      <>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 text-sm font-medium text-primary">
          ✅ {newExName}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div><label className="text-[10px] text-muted-foreground">سيتات</label><Input type="number" dir="ltr" value={newExSets} onChange={e => setNewExSets(e.target.value)} className="h-8 text-xs" /></div>
          <div><label className="text-[10px] text-muted-foreground">تكرارات</label><Input type="number" dir="ltr" value={newExReps} onChange={e => setNewExReps(e.target.value)} className="h-8 text-xs" /></div>
          <div><label className="text-[10px] text-muted-foreground">وزن كجم</label><Input type="number" dir="ltr" value={newExWeight} onChange={e => setNewExWeight(e.target.value)} className="h-8 text-xs" /></div>
          <div><label className="text-[10px] text-muted-foreground">راحة ث</label><Input type="number" dir="ltr" value={newExRest} onChange={e => setNewExRest(e.target.value)} className="h-8 text-xs" /></div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">📹 رابط فيديو (اختياري)</label>
          <Input type="url" dir="ltr" placeholder="https://..." value={newExVideo} onChange={e => setNewExVideo(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-8 text-xs" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> إضافة</>}
          </Button>
          {!inline && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>إلغاء</Button>}
        </div>
      </>
    )}
  </div>
);

export default ProgramBuilder;
