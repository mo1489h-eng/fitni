import { useState, useMemo, useCallback } from "react";
import usePageTitle from "@/hooks/usePageTitle";
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
  Copy, CopyPlus, Search, ArrowRight, Flame, Shield, HeartPulse, Swords, Moon, X, Eye, Save,
  GripVertical, Link2, ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import CopyProgramModal from "@/components/CopyProgramModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ── Exercise Library ──
const exerciseLibrary = [
  { name: "بنش برس", muscle: "صدر" }, { name: "بنش برس مائل", muscle: "صدر" },
  { name: "تفتيح دمبل", muscle: "صدر" }, { name: "بوش أب", muscle: "صدر" }, { name: "ديبس", muscle: "صدر" },
  { name: "كروس أوفر", muscle: "صدر" }, { name: "تفتيح آلة", muscle: "صدر" },
  { name: "سكوات", muscle: "أرجل" }, { name: "سكوات أمامي", muscle: "أرجل" },
  { name: "ليج برس", muscle: "أرجل" }, { name: "ليج كيرل", muscle: "أرجل" },
  { name: "ليج اكستنشن", muscle: "أرجل" }, { name: "لانجز", muscle: "أرجل" },
  { name: "هاك سكوات", muscle: "أرجل" }, { name: "سمانة واقف", muscle: "أرجل" },
  { name: "ديدليفت", muscle: "ظهر" }, { name: "ديدليفت روماني", muscle: "ظهر" },
  { name: "سحب أمامي", muscle: "ظهر" }, { name: "سحب خلفي", muscle: "ظهر" },
  { name: "تجديف بار", muscle: "ظهر" }, { name: "تجديف دمبل", muscle: "ظهر" },
  { name: "سحب أرضي", muscle: "ظهر" }, { name: "بول أوفر", muscle: "ظهر" },
  { name: "ضغط أكتاف", muscle: "أكتاف" }, { name: "رفرفة جانبية", muscle: "أكتاف" },
  { name: "رفرفة أمامية", muscle: "أكتاف" }, { name: "شرق", muscle: "أكتاف" },
  { name: "فيس بول", muscle: "أكتاف" },
  { name: "بايسبس كيرل", muscle: "بايسبس" }, { name: "هامر كيرل", muscle: "بايسبس" },
  { name: "بايسبس بار", muscle: "بايسبس" }, { name: "بايسبس كيبل", muscle: "بايسبس" },
  { name: "ترايسبس بوش داون", muscle: "ترايسبس" }, { name: "فرنش برس", muscle: "ترايسبس" },
  { name: "ديبس ترايسبس", muscle: "ترايسبس" }, { name: "كيك باك", muscle: "ترايسبس" },
  { name: "كرنش", muscle: "كور" }, { name: "بلانك", muscle: "كور" },
  { name: "ليج ريز", muscle: "كور" }, { name: "روسيان تويست", muscle: "كور" },
  { name: "ماونتن كلايمر", muscle: "كور" },
  { name: "كارديو - مشي", muscle: "كارديو" }, { name: "كارديو - جري", muscle: "كارديو" },
  { name: "كارديو - دراجة", muscle: "كارديو" }, { name: "كارديو - حبل", muscle: "كارديو" },
];

const MUSCLE_GROUPS = ["الكل", "صدر", "ظهر", "أكتاف", "أرجل", "بايسبس", "ترايسبس", "كور", "كارديو"];
const MUSCLE_COLORS: Record<string, string> = {
  "صدر": "bg-red-500/15 text-red-400 border-red-500/20",
  "أرجل": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "ظهر": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "أكتاف": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "بايسبس": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "ترايسبس": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "كور": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "كارديو": "bg-primary/15 text-primary border-primary/20",
};

const weekDays = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const GOALS = [
  { value: "تخسيس", icon: "", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "بناء عضلات", icon: "", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "لياقة عامة", icon: "", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "تأهيل", icon: "", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "قوة", icon: "", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
];
const LEVELS = [
  { value: "مبتدئ", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "متوسط", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { value: "متقدم", color: "bg-destructive/10 text-destructive border-destructive/20" },
];
const DURATIONS = [4, 8, 12, 16];

interface LocalExercise {
  id: string;
  name: string; muscle: string; sets: number; reps: number; weight: number;
  video_url: string; rest_seconds: number; notes: string;
  supersetWith?: string; // id of paired exercise
}

interface LocalDay {
  dayName: string; isRest: boolean; exercises: LocalExercise[];
  warmup: LocalExercise[];
  label: string; // custom label like "صدر وترايسبس"
}

let _eid = 0;
const genId = () => `ex_${Date.now()}_${_eid++}`;

// ── Templates ──
const templates = [
  {
    name: "تخسيس 8 أسابيع", icon: Flame, weeks: 8, goal: "تخسيس", level: "متوسط",
    desc: "كارديو + أوزان لحرق الدهون",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي + كارديو", warmup: [], exercises: [
        { id: genId(), name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 30, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { id: genId(), name: "سكوات", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "بنش برس", muscle: "صدر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "كرنش", muscle: "كور", sets: 3, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "اثنين", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "ثلاثاء", isRest: false, label: "ظهر + أكتاف", warmup: [], exercises: [
        { id: genId(), name: "كارديو - دراجة", muscle: "كارديو", sets: 1, reps: 20, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { id: genId(), name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "بلانك", muscle: "كور", sets: 3, reps: 45, weight: 0, video_url: "", rest_seconds: 30, notes: "" },
      ]},
      { dayName: "أربعاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "خميس", isRest: false, label: "أرجل + صدر", warmup: [], exercises: [
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 12, weight: 60, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 15, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "تجديف دمبل", muscle: "ظهر", sets: 3, reps: 12, weight: 15, video_url: "", rest_seconds: 60, notes: "" },
      ]},
    ],
  },
  {
    name: "بناء عضلات 12 أسبوع", icon: Dumbbell, weeks: 12, goal: "بناء عضلات", level: "متقدم",
    desc: "سبليت متقدم لزيادة الكتلة العضلية",
    days: [
      { dayName: "أحد", isRest: false, label: "صدر + ترايسبس", warmup: [], exercises: [
        { id: genId(), name: "بنش برس", muscle: "صدر", sets: 4, reps: 8, weight: 60, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "بنش برس مائل", muscle: "صدر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 16, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "ترايسبس بوش داون", muscle: "ترايسبس", sets: 3, reps: 12, weight: 25, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, label: "ظهر + بايسبس", warmup: [], exercises: [
        { id: genId(), name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "تجديف بار", muscle: "ظهر", sets: 4, reps: 8, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "بايسبس بار", muscle: "بايسبس", sets: 3, reps: 10, weight: 25, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "أربعاء", isRest: false, label: "أكتاف", warmup: [], exercises: [
        { id: genId(), name: "ضغط أكتاف", muscle: "أكتاف", sets: 4, reps: 10, weight: 40, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "رفرفة جانبية", muscle: "أكتاف", sets: 4, reps: 15, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "شرق", muscle: "أكتاف", sets: 4, reps: 15, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "خميس", isRest: false, label: "أرجل", warmup: [], exercises: [
        { id: genId(), name: "سكوات", muscle: "أرجل", sets: 4, reps: 8, weight: 80, video_url: "", rest_seconds: 120, notes: "" },
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 10, weight: 120, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "ليج كيرل", muscle: "أرجل", sets: 3, reps: 12, weight: 35, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "ديدليفت روماني", muscle: "أرجل", sets: 3, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
      ]},
    ],
  },
  {
    name: "مبتدئ 4 أسابيع", icon: Shield, weeks: 4, goal: "لياقة عامة", level: "مبتدئ",
    desc: "فول بادي مناسب للمبتدئين",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي A", warmup: [], exercises: [
        { id: genId(), name: "بنش برس", muscle: "صدر", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "سكوات", muscle: "أرجل", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "سحب أمامي", muscle: "ظهر", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "اثنين", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "ثلاثاء", isRest: false, label: "فول بادي B", warmup: [], exercises: [
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 3, reps: 12, weight: 60, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "تجديف دمبل", muscle: "ظهر", sets: 3, reps: 12, weight: 12, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "أربعاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "خميس", isRest: false, label: "فول بادي C", warmup: [], exercises: [
        { id: genId(), name: "بوش أب", muscle: "صدر", sets: 3, reps: 10, weight: 0, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "لانجز", muscle: "أرجل", sets: 3, reps: 10, weight: 10, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "رفرفة جانبية", muscle: "أكتاف", sets: 3, reps: 15, weight: 6, video_url: "", rest_seconds: 60, notes: "" },
      ]},
    ],
  },
  {
    name: "لياقة 6 أسابيع", icon: HeartPulse, weeks: 6, goal: "لياقة عامة", level: "متوسط",
    desc: "تدريب وظيفي لتحسين اللياقة",
    days: [
      { dayName: "أحد", isRest: false, label: "كارديو + قوة", warmup: [], exercises: [
        { id: genId(), name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 20, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { id: genId(), name: "سكوات", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "بوش أب", muscle: "صدر", sets: 4, reps: 12, weight: 0, video_url: "", rest_seconds: 60, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, label: "ظهر + كور", warmup: [], exercises: [
        { id: genId(), name: "ديدليفت", muscle: "ظهر", sets: 4, reps: 10, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "سحب أمامي", muscle: "ظهر", sets: 3, reps: 12, weight: 35, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "روسيان تويست", muscle: "كور", sets: 3, reps: 20, weight: 5, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "أربعاء", isRest: false, label: "أرجل + أكتاف", warmup: [], exercises: [
        { id: genId(), name: "لانجز", muscle: "أرجل", sets: 4, reps: 12, weight: 15, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, notes: "" },
        { id: genId(), name: "كرنش", muscle: "كور", sets: 4, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
    ],
  },
  {
    name: "قتالي 8 أسابيع", icon: Swords, weeks: 8, goal: "قوة", level: "متقدم",
    desc: "قوة + كارديو للرياضات القتالية",
    days: [
      { dayName: "أحد", isRest: false, label: "قوة", warmup: [], exercises: [
        { id: genId(), name: "ديدليفت", muscle: "ظهر", sets: 4, reps: 6, weight: 80, video_url: "", rest_seconds: 120, notes: "" },
        { id: genId(), name: "سكوات", muscle: "أرجل", sets: 4, reps: 8, weight: 70, video_url: "", rest_seconds: 120, notes: "" },
        { id: genId(), name: "بلانك", muscle: "كور", sets: 3, reps: 60, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "اثنين", isRest: false, label: "كارديو + كور", warmup: [], exercises: [
        { id: genId(), name: "كارديو - جري", muscle: "كارديو", sets: 1, reps: 25, weight: 0, video_url: "", rest_seconds: 0, notes: "" },
        { id: genId(), name: "بوش أب", muscle: "صدر", sets: 4, reps: 20, weight: 0, video_url: "", rest_seconds: 45, notes: "" },
        { id: genId(), name: "روسيان تويست", muscle: "كور", sets: 4, reps: 25, weight: 8, video_url: "", rest_seconds: 45, notes: "" },
      ]},
      { dayName: "ثلاثاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "أربعاء", isRest: false, label: "أعلى الجسم", warmup: [], exercises: [
        { id: genId(), name: "بنش برس", muscle: "صدر", sets: 4, reps: 8, weight: 50, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "سحب أمامي", muscle: "ظهر", sets: 4, reps: 10, weight: 45, video_url: "", rest_seconds: 90, notes: "" },
        { id: genId(), name: "ضغط أكتاف", muscle: "أكتاف", sets: 3, reps: 10, weight: 30, video_url: "", rest_seconds: 60, notes: "" },
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
  const [addExDay, setAddExDay] = useState<string | null>(null);

  // ── Create Form (Step 1) ──
  const [programName, setProgramName] = useState("");
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [programDesc, setProgramDesc] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // ── Step 2: Workout Builder ──
  const [localDays, setLocalDays] = useState<LocalDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [activeWeek, setActiveWeek] = useState(1);
  const [showExLibrary, setShowExLibrary] = useState(false);
  const [exLibFilter, setExLibFilter] = useState("الكل");
  const [exLibSearch, setExLibSearch] = useState("");
  const [addingToWarmup, setAddingToWarmup] = useState(false);
  const [copyDayDialog, setCopyDayDialog] = useState(false);

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
    let list = exerciseLibrary;
    if (exLibFilter !== "الكل") list = list.filter(e => e.muscle === exLibFilter);
    if (exLibSearch) list = list.filter(e => e.name.includes(exLibSearch) || e.muscle.includes(exLibSearch));
    return list;
  }, [exLibFilter, exLibSearch]);

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
        program_id: program.id, day_name: d.label || d.dayName, day_order: i,
      }));
      const { data: days, error: dErr } = await supabase.from("program_days").insert(daysToInsert).select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      for (const day of days!) {
        const localDay = localDays.find(d => (d.label || d.dayName) === day.day_name);
        if (localDay) {
          [...localDay.warmup, ...localDay.exercises].forEach((ex, idx) => {
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

  const resetForm = () => {
    setProgramName(""); setProgramGoal(""); setProgramLevel("");
    setWeeks(8); setProgramDesc(""); setSelectedDays([]); setLocalDays([]);
    setActiveDay(0); setActiveWeek(1);
  };

  // ── Step 1 → Step 2 ──
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

  // ── Day Helpers ──
  const currentDay = localDays[activeDay];

  const updateDay = useCallback((idx: number, updater: (d: LocalDay) => LocalDay) => {
    setLocalDays(prev => prev.map((d, i) => i === idx ? updater(d) : d));
  }, []);

  const addExerciseToDay = (ex: typeof exerciseLibrary[0]) => {
    const newEx: LocalExercise = {
      id: genId(), name: ex.name, muscle: ex.muscle,
      sets: 3, reps: 10, weight: 0, video_url: "", rest_seconds: 60, notes: "",
    };
    if (addingToWarmup) {
      updateDay(activeDay, d => ({ ...d, warmup: [...d.warmup, newEx] }));
    } else {
      updateDay(activeDay, d => ({ ...d, exercises: [...d.exercises, newEx] }));
    }
    setShowExLibrary(false);
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

  const applyTemplate = (t: typeof templates[0]) => {
    setProgramName(t.name); setProgramGoal(t.goal); setProgramLevel(t.level);
    setWeeks(t.weeks);
    const days = t.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => ({ ...e, id: genId() })),
      warmup: d.warmup?.map((e: any) => ({ ...e, id: genId() })) || [],
    }));
    setLocalDays(days);
    setSelectedDays(t.days.map(d => d.dayName));
    setActiveDay(0);
    setView("step2");
    toast({ title: `تم تحميل قالب "${t.name}"` });
  };

  const getGoalBadge = (goal: string) => GOALS.find(g => g.value === goal);

  // ── Estimated Duration ──
  const calcDuration = (day: LocalDay) => {
    const total = [...day.warmup, ...day.exercises].reduce((s, e) => s + e.sets * (e.rest_seconds > 0 ? (45 + e.rest_seconds) / 60 : 1.5), 0);
    return Math.round(total);
  };

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
                            <p className="font-medium text-foreground text-sm">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">{ex.sets}×{ex.reps} {ex.weight > 0 && `• ${ex.weight}كجم`}</p>
                          </div>
                          <button onClick={() => deleteExMutation.mutate(ex.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
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
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Templates */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-primary" />قوالب جاهزة
            </h3>
            <div data-tour="program-templates" className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {templates.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)}
                  className="flex-shrink-0 w-40 rounded-xl border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <t.icon className="w-5 h-5 text-primary mb-1" />
                  <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                  <div className="flex gap-1.5 mt-1.5 text-[9px] text-muted-foreground">
                    <span>{t.weeks} أسابيع</span><span>•</span>
                    <span>{t.days.filter(d => !d.isRest).length} أيام</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Program Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">اسم البرنامج</label>
            <Input placeholder="مثال: برنامج تخسيس متقدم..." value={programName}
              onChange={e => setProgramName(e.target.value)} className="text-lg font-bold h-12" />
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">الهدف</label>
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

          {/* Level */}
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

          {/* Duration */}
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

          {/* Description */}
          <Textarea placeholder="وصف البرنامج (اختياري)..." value={programDesc} onChange={e => setProgramDesc(e.target.value)} rows={2} />

          {/* Days Selection */}
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

          {/* Next Button */}
          <div className="sticky bottom-16 bg-card border border-border rounded-xl p-3 flex gap-2 shadow-lg z-40">
            <Button variant="outline" className="flex-1" onClick={() => { setView("list"); resetForm(); }}>إلغاء</Button>
            <Button className="flex-1 gap-1" onClick={proceedToStep2} disabled={!programName.trim() || selectedDays.length === 0}>
              التالي: بناء التمارين <ArrowRight className="w-4 h-4 rotate-180" />
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
                <ChevronRight className="w-3 h-3" />الرجوع
              </button>
              <h1 className="text-lg font-bold text-foreground">{programName}</h1>
              <div className="flex items-center gap-2 mt-1">
                {programGoal && <Badge variant="secondary" className="text-[10px]">{GOALS.find(g => g.value === programGoal)?.icon} {programGoal}</Badge>}
                {programLevel && <Badge variant="secondary" className="text-[10px]">{programLevel}</Badge>}
                <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 ml-0.5" />{weeks} أسابيع</Badge>
              </div>
            </div>
          </div>

          {/* Week Navigation */}
          {weeks > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))} disabled={activeWeek === 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
                {Array.from({ length: Math.min(weeks, 12) }, (_, i) => i + 1).map(w => (
                  <button key={w} onClick={() => setActiveWeek(w)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeWeek === w ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}>
                    أسبوع {w}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveWeek(Math.min(weeks, activeWeek + 1))} disabled={activeWeek === weeks}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Day Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4">
            {localDays.map((day, idx) => (
              <button key={day.dayName} onClick={() => setActiveDay(idx)}
                className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-center transition-all min-w-[80px] ${
                  activeDay === idx
                    ? day.isRest
                      ? "bg-muted border-2 border-border text-muted-foreground"
                      : "bg-primary/10 border-2 border-primary text-primary"
                    : "border-2 border-border text-muted-foreground hover:border-primary/20"
                }`}>
                <p className="text-xs font-bold">{day.dayName}</p>
                {day.isRest ? (
                  <p className="text-[10px] mt-0.5">راحة</p>
                ) : (
                  <p className="text-[10px] mt-0.5">{day.exercises.length} تمارين</p>
                )}
              </button>
            ))}
          </div>

          {/* Active Day Content */}
          {currentDay && (
            <div className="space-y-3">
              {/* Day Header Card */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {currentDay.isRest ? (
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Dumbbell className="w-5 h-5 text-primary" />
                    )}
                    <Input
                      value={currentDay.label}
                      onChange={e => updateDay(activeDay, d => ({ ...d, label: e.target.value }))}
                      placeholder={`تسمية اليوم (مثل: صدر وترايسبس)`}
                      className="border-0 bg-transparent text-base font-bold p-0 h-auto focus-visible:ring-0"
                      disabled={currentDay.isRest}
                    />
                  </div>
                  <button onClick={toggleRestDay}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                      currentDay.isRest ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {currentDay.isRest ? "تفعيل" : "يوم راحة"}
                  </button>
                </div>
                {!currentDay.isRest && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{currentDay.exercises.length} تمارين</span>
                    <span>~{calcDuration(currentDay)} دقيقة</span>
                    {currentDay.warmup.length > 0 && <span>{currentDay.warmup.length} إحماء</span>}
                  </div>
                )}
                {!currentDay.isRest && (
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => setCopyDayDialog(true)}>
                      <Copy className="w-3 h-3" />نسخ هذا اليوم
                    </Button>
                  </div>
                )}
              </Card>

              {!currentDay.isRest && (
                <>
                  {/* Warmup Section */}
                  <Collapsible>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-foreground">الإحماء</span>
                          <span className="text-[10px] text-muted-foreground">{currentDay.warmup.length} تمارين</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-3 space-y-2">
                          {currentDay.warmup.map(ex => (
                            <ExerciseCard key={ex.id} ex={ex} isWarmup
                              onUpdate={(field, val) => updateExField(ex.id, field, val, true)}
                              onRemove={() => removeExercise(ex.id, true)}
                            />
                          ))}
                          <Button variant="outline" size="sm" className="w-full gap-1 text-xs h-8"
                            onClick={() => { setAddingToWarmup(true); setShowExLibrary(true); }}>
                            <Plus className="w-3.5 h-3.5" />إضافة إحماء
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
                      const showSupersetBadge = isSuperset || isFirstInSuperset;

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
                            onUpdate={(field, val) => updateExField(ex.id, field, val)}
                            onRemove={() => removeExercise(ex.id)}
                            onDuplicate={() => duplicateExercise(ex.id)}
                            onMoveUp={idx > 0 ? () => moveExercise(ex.id, "up") : undefined}
                            onMoveDown={idx < currentDay.exercises.length - 1 ? () => moveExercise(ex.id, "down") : undefined}
                            onSuperset={idx < currentDay.exercises.length - 1 ? () => toggleSuperset(ex.id) : undefined}
                            isSuperset={showSupersetBadge}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Exercise Button */}
                  <Button className="w-full gap-2 h-12 text-sm" variant="outline"
                    onClick={() => { setAddingToWarmup(false); setShowExLibrary(true); }}>
                    <Plus className="w-5 h-5" />إضافة تمرين
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Sticky Bottom Bar - above bottom nav */}
          <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border p-3 flex gap-2 z-[60] max-w-screen-xl mx-auto shadow-lg">
            <Button variant="outline" className="flex-1 gap-1 text-xs" onClick={() => {
              toast({ title: "تم حفظ المسودة" });
            }}>
              <Save className="w-3.5 h-3.5" />حفظ مسودة
            </Button>
            <Button className="flex-[2] gap-1 text-sm"
              disabled={createMutation.isPending || localDays.filter(d => !d.isRest).length === 0}
              onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "نشر البرنامج"}
            </Button>
          </div>

          {/* Exercise Library Dialog */}
          <Dialog open={showExLibrary} onOpenChange={setShowExLibrary}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" dir="rtl">
              <DialogHeader>
                <DialogTitle>{addingToWarmup ? "إضافة تمرين إحماء" : "إضافة تمرين"}</DialogTitle>
              </DialogHeader>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="ابحث عن تمرين..." value={exLibSearch}
                  onChange={e => setExLibSearch(e.target.value)} className="pr-10" />
              </div>

              {/* Muscle Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {MUSCLE_GROUPS.map(g => (
                  <button key={g} onClick={() => setExLibFilter(g)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                      exLibFilter === g
                        ? g === "الكل" ? "bg-primary/10 text-primary border-primary/20" : (MUSCLE_COLORS[g] || "bg-primary/10 text-primary border-primary/20")
                        : "border-border text-muted-foreground hover:border-primary/20"
                    }`}>
                    {g}
                  </button>
                ))}
              </div>

              {/* Exercise List */}
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {filteredLibrary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">لا توجد نتائج</p>
                ) : (
                  filteredLibrary.map(ex => (
                    <button key={ex.name} onClick={() => addExerciseToDay(ex)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-right">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${MUSCLE_COLORS[ex.muscle] || "bg-muted"}`}>
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{ex.name}</p>
                        <Badge variant="secondary" className={`text-[9px] mt-0.5 ${MUSCLE_COLORS[ex.muscle] || ""}`}>{ex.muscle}</Badge>
                      </div>
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Copy Day Dialog */}
          <Dialog open={copyDayDialog} onOpenChange={setCopyDayDialog}>
            <DialogContent className="max-w-sm" dir="rtl">
              <DialogHeader><DialogTitle>نسخ اليوم إلى</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {localDays.map((d, idx) => {
                  if (idx === activeDay) return null;
                  return (
                    <button key={d.dayName} onClick={() => copyDayTo(idx)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
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
      <div className="space-y-5 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">البرامج التدريبية</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{programs.length} برنامج</p>
          </div>
          <Button size="sm" onClick={() => setView("step1")} className="gap-1">
            <Plus className="w-4 h-4" />برنامج جديد
          </Button>
        </div>

        {/* Templates */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-primary" />قوالب جاهزة
          </h3>
          <div data-tour="program-templates" className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {templates.map(t => (
              <button key={t.name} onClick={() => applyTemplate(t)}
                className="flex-shrink-0 w-44 rounded-xl border border-border p-3 text-right hover:border-primary/50 hover:bg-primary/5 transition-all group">
                <t.icon className="w-5 h-5 text-primary mb-1" />
                <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                <div className="flex gap-1.5 mt-1.5 text-[9px] text-muted-foreground">
                  <span>{t.weeks} أسابيع</span><span>•</span>
                  <span>{t.days.filter(d => !d.isRest).length} أيام</span>
                </div>
                <div className="mt-2 text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 rotate-180" />عدّل وأضف للبرامج
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Programs Grid */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">برامجك</h3>
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : programs.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">لم تبنِ برامج بعد</h3>
              <p className="text-sm text-muted-foreground">استخدم قالب جاهز أو ابنِ من الصفر</p>
              <Button onClick={() => setView("step1")} className="gap-1"><Plus className="w-4 h-4" />برنامج جديد</Button>
            </div>
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
                      <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 ml-0.5" />{program.weeks} أسابيع</Badge>
                      <Badge variant="secondary" className="text-[10px]"><Users className="w-3 h-3 ml-0.5" />{clientCount} متدرب</Badge>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setViewProgramId(program.id); setView("detail"); }}>تعديل</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                        onClick={e => { e.stopPropagation(); setCopyProgramId(program.id); }}><Users className="w-3 h-3" />تعيين</Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive gap-0.5"
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(program.id); }}><Trash2 className="w-3 h-3" /></Button>
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

// ── Exercise Card Component ──
const ExerciseCard = ({
  ex, isWarmup, isSuperset,
  onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, onSuperset,
}: {
  ex: LocalExercise;
  isWarmup?: boolean;
  isSuperset?: boolean;
  onUpdate: (field: keyof LocalExercise, value: any) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSuperset?: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const muscleColor = MUSCLE_COLORS[ex.muscle] || "bg-muted text-muted-foreground";

  return (
    <Card className={`overflow-hidden ${isSuperset ? "border-primary/30" : ""}`}>
      {/* Main Row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag Handle + Reorder */}
        {!isWarmup && (
          <div className="flex flex-col gap-0.5">
            {onMoveUp && <button onClick={onMoveUp} className="text-muted-foreground hover:text-foreground"><ChevronUp className="w-3 h-3" /></button>}
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
            {onMoveDown && <button onClick={onMoveDown} className="text-muted-foreground hover:text-foreground"><ChevronDown className="w-3 h-3" /></button>}
          </div>
        )}

        {/* Exercise Info */}
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-right">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{ex.name}</p>
            {isSuperset && <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] px-1.5">SS</Badge>}
          </div>
          <Badge variant="secondary" className={`text-[9px] mt-1 ${muscleColor}`}>{ex.muscle}</Badge>
        </button>

        {/* Quick Stats */}
        <div className="text-left text-[10px] text-muted-foreground whitespace-nowrap">
          <p>{ex.sets}×{ex.reps}</p>
          {ex.weight > 0 && <p>{ex.weight}كجم</p>}
        </div>

        {/* Remove */}
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20">
          {/* Sets/Reps/Weight/Rest Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">السيتات</label>
              <Input type="number" dir="ltr" value={ex.sets}
                onChange={e => onUpdate("sets", Number(e.target.value) || 1)}
                className="h-9 text-center text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">التكرارات</label>
              <Input type="number" dir="ltr" value={ex.reps}
                onChange={e => onUpdate("reps", Number(e.target.value) || 1)}
                className="h-9 text-center text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">الوزن كجم</label>
              <Input type="number" dir="ltr" value={ex.weight}
                onChange={e => onUpdate("weight", Number(e.target.value) || 0)}
                className="h-9 text-center text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">راحة (ث)</label>
              <Input type="number" dir="ltr" value={ex.rest_seconds}
                onChange={e => onUpdate("rest_seconds", Number(e.target.value) || 0)}
                className="h-9 text-center text-sm" />
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">رابط الفيديو (اختياري)</label>
            <Input type="url" dir="ltr" placeholder="https://..."
              value={ex.video_url} onChange={e => onUpdate("video_url", e.target.value)}
              className="h-8 text-xs" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">ملاحظة للمتدرب</label>
            <Input placeholder="مثال: ركز على السلبي..."
              value={ex.notes} onChange={e => onUpdate("notes", e.target.value)}
              className="h-8 text-xs" />
          </div>

          {/* Action Buttons */}
          {!isWarmup && (
            <div className="flex gap-2 pt-1">
              {onDuplicate && (
                <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={onDuplicate}>
                  <CopyPlus className="w-3 h-3" />نسخ التمرين
                </Button>
              )}
              {onSuperset && (
                <Button variant="outline" size="sm"
                  className={`text-[10px] h-7 gap-1 flex-1 ${isSuperset ? "border-primary/30 text-primary" : ""}`}
                  onClick={onSuperset}>
                  <Link2 className="w-3 h-3" />سوبرسيت
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ProgramBuilder;
