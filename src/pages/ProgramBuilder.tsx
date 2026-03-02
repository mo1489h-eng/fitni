import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ChevronDown, ChevronUp, Trash2, Loader2, ClipboardList, Dumbbell, Calendar, Users, Video, Copy, GripVertical, CopyPlus, Search,
} from "lucide-react";
import ProgramTemplates from "@/components/ProgramTemplates";
import CopyProgramModal from "@/components/CopyProgramModal";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const exerciseLibrary = [
  "بنش برس", "بنش برس مائل", "تفتيح دمبل", "بوش أب", "ديبس",
  "سكوات", "سكوات أمامي", "ليج برس", "ليج كيرل", "ليج اكستنشن", "لانجز",
  "ديدليفت", "ديدليفت روماني",
  "سحب أمامي", "سحب خلفي", "تجديف بار", "تجديف دمبل",
  "ضغط أكتاف", "رفرفة جانبية", "رفرفة أمامية", "شرق",
  "بايسبس كيرل", "هامر كيرل", "بايسبس بار",
  "ترايسبس بوش داون", "فرنش برس", "ديبس ترايسبس",
  "كرنش", "بلانك", "ليج ريز", "روسيان تويست",
  "كارديو - مشي", "كارديو - جري", "كارديو - دراجة",
];

const weekDays = [
  { key: "أحد", label: "أحد" },
  { key: "اثنين", label: "اثنين" },
  { key: "ثلاثاء", label: "ثلاثاء" },
  { key: "أربعاء", label: "أربعاء" },
  { key: "خميس", label: "خميس" },
  { key: "جمعة", label: "جمعة" },
  { key: "سبت", label: "سبت" },
];

const GOALS = ["تخسيس", "بناء عضلات", "لياقة عامة", "تأهيل"];
const LEVELS = ["مبتدئ", "متوسط", "متقدم"];

interface LocalExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  video_url: string;
  rest_seconds: number;
  notes: string;
}

interface LocalDay {
  dayName: string;
  exercises: LocalExercise[];
}

const ProgramBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [programName, setProgramName] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayExercises, setDayExercises] = useState<Record<string, LocalExercise[]>>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("10");
  const [newExWeight, setNewExWeight] = useState("0");
  const [newExVideoUrl, setNewExVideoUrl] = useState("");
  const [newExRest, setNewExRest] = useState("60");
  const [newExNotes, setNewExNotes] = useState("");
  const [exSearch, setExSearch] = useState("");

  // New fields
  const [programGoal, setProgramGoal] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [programDescription, setProgramDescription] = useState("");

  // View state
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
  const [viewExpanded, setViewExpanded] = useState<string | null>(null);
  const [addExDay, setAddExDay] = useState<string | null>(null);

  // Assign modal
  const [assignProgramId, setAssignProgramId] = useState<string | null>(null);

  // Fetch programs
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, program_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Copy program modal state
  const [copyProgramId, setCopyProgramId] = useState<string | null>(null);
  const copyProgram = programs.find((p) => p.id === copyProgramId);

  // Fetch days + exercises for viewed program
  const { data: programDays = [] } = useQuery({
    queryKey: ["program-days", viewProgramId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_days")
        .select("*, program_exercises(*)")
        .eq("program_id", viewProgramId!)
        .order("day_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!viewProgramId,
  });

  // Create program mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!programName.trim()) throw new Error("أدخل اسم البرنامج");
      if (selectedDays.length === 0) throw new Error("اختر أيام التدريب");

      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: user!.id, name: programName.trim(), weeks: Number(weeks) })
        .select()
        .single();
      if (pErr) throw pErr;

      const daysToInsert = selectedDays.map((dayName, i) => ({
        program_id: program.id,
        day_name: dayName,
        day_order: i,
      }));
      const { data: days, error: dErr } = await supabase
        .from("program_days")
        .insert(daysToInsert)
        .select();
      if (dErr) throw dErr;

      const exercisesToInsert: any[] = [];
      for (const day of days) {
        const exs = dayExercises[day.day_name] || [];
        exs.forEach((ex, idx) => {
          exercisesToInsert.push({
            day_id: day.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            exercise_order: idx,
            video_url: ex.video_url || null,
          });
        });
      }

      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }

      return program;
    },
    onSuccess: (program) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      resetForm();
      setAssignProgramId(program.id);
      toast({ title: "تم إنشاء البرنامج بنجاح 🎉" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  // Delete program
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setViewProgramId(null);
      toast({ title: "تم حذف البرنامج" });
    },
  });

  // Delete exercise
  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("program_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-days", viewProgramId] });
    },
  });

  // Add exercise to existing day
  const addExerciseMutation = useMutation({
    mutationFn: async ({ dayId, exercise }: { dayId: string; exercise: LocalExercise }) => {
      const { error } = await supabase.from("program_exercises").insert({
        day_id: dayId,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        video_url: exercise.video_url || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-days", viewProgramId] });
      setAddExDay(null);
      resetExForm();
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setProgramName("");
    setWeeks("8");
    setSelectedDays([]);
    setDayExercises({});
    setExpandedDay(null);
    setProgramGoal("");
    setProgramLevel("");
    setProgramDescription("");
  };

  const resetExForm = () => {
    setNewExName("");
    setNewExSets("3");
    setNewExReps("10");
    setNewExWeight("0");
    setNewExVideoUrl("");
    setNewExRest("60");
    setNewExNotes("");
    setExSearch("");
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addExerciseToDay = (day: string) => {
    if (!newExName) return;
    setDayExercises((prev) => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        { name: newExName, sets: Number(newExSets) || 3, reps: Number(newExReps) || 10, weight: Number(newExWeight) || 0, video_url: newExVideoUrl, rest_seconds: Number(newExRest) || 60, notes: newExNotes },
      ],
    }));
    resetExForm();
  };

  const removeExerciseFromDay = (day: string, idx: number) => {
    setDayExercises((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== idx),
    }));
  };

  const duplicateExercise = (day: string, idx: number) => {
    setDayExercises((prev) => {
      const exs = [...(prev[day] || [])];
      exs.splice(idx + 1, 0, { ...exs[idx] });
      return { ...prev, [day]: exs };
    });
  };

  const moveExercise = (day: string, idx: number, direction: "up" | "down") => {
    setDayExercises((prev) => {
      const exs = [...(prev[day] || [])];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= exs.length) return prev;
      [exs[idx], exs[targetIdx]] = [exs[targetIdx], exs[idx]];
      return { ...prev, [day]: exs };
    });
  };

  const getClientCount = (programId: string) =>
    clients.filter((c) => c.program_id === programId).length;

  const filteredLibrary = exSearch
    ? exerciseLibrary.filter((e) => e.includes(exSearch))
    : exerciseLibrary;

  // Quick templates for the create form
  const quickTemplates = [
    { name: "برنامج تخسيس 8 أسابيع", goal: "تخسيس", level: "متوسط", weeks: "8", days: ["أحد", "ثلاثاء", "خميس"] },
    { name: "بناء عضلات 12 أسبوع", goal: "بناء عضلات", level: "متقدم", weeks: "12", days: ["أحد", "اثنين", "أربعاء", "خميس"] },
    { name: "مبتدئ 4 أسابيع", goal: "لياقة عامة", level: "مبتدئ", weeks: "4", days: ["أحد", "ثلاثاء", "خميس"] },
    { name: "لياقة عامة 6 أسابيع", goal: "لياقة عامة", level: "متوسط", weeks: "6", days: ["أحد", "اثنين", "أربعاء", "خميس"] },
  ];

  const applyQuickTemplate = (t: typeof quickTemplates[0]) => {
    setProgramName(t.name);
    setProgramGoal(t.goal);
    setProgramLevel(t.level);
    setWeeks(t.weeks);
    setSelectedDays(t.days);
  };

  // ===== VIEW PROGRAM DETAIL =====
  if (viewProgramId) {
    const program = programs.find((p) => p.id === viewProgramId);
    if (!program) return null;

    return (
      <TrainerLayout>
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setViewProgramId(null)} className="text-sm text-primary hover:underline font-medium">
              ← العودة للبرامج
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCopyProgramId(program.id)}>
                <Copy className="w-4 h-4 ml-1" />نسخ للعملاء
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(program.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4 ml-1" />حذف
              </Button>
            </div>
          </div>

          <Card className="p-4">
            <h1 className="text-xl font-bold text-card-foreground">{program.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{program.weeks} أسابيع</span>
              <span className="flex items-center gap-1"><Dumbbell className="w-4 h-4" />{programDays.length} أيام</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{getClientCount(program.id)} متدرب</span>
            </div>
          </Card>

          <div className="space-y-3">
            {programDays.map((day) => {
              const exercises = (day as any).program_exercises || [];
              const isExp = viewExpanded === day.id;

              return (
                <Card key={day.id} className="overflow-hidden">
                  <button onClick={() => setViewExpanded(isExp ? null : day.id)} className="w-full flex items-center justify-between p-4 text-right">
                    <div>
                      <h3 className="font-bold text-card-foreground">{day.day_name}</h3>
                      <p className="text-xs text-muted-foreground">{exercises.length} تمارين</p>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExp && (
                    <div className="border-t border-border p-4 space-y-2">
                      {exercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">لا توجد تمارين</p>}
                      {exercises.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                          <div>
                            <p className="font-medium text-secondary-foreground">
                              {ex.name}
                              {ex.video_url && (
                                <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex mr-1.5 text-primary hover:text-primary/80">
                                  <Video className="w-4 h-4" />
                                </a>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ex.sets} مجموعات × {ex.reps} تكرار
                              {ex.weight > 0 && ` • ${ex.weight} كجم`}
                            </p>
                          </div>
                          <button onClick={() => deleteExerciseMutation.mutate(ex.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {addExDay === day.id ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="ابحث عن تمرين..." value={exSearch} onChange={(e) => setExSearch(e.target.value)} className="pr-10" />
                          </div>
                          <Select value={newExName} onValueChange={setNewExName}>
                            <SelectTrigger><SelectValue placeholder="اختر تمرين" /></SelectTrigger>
                            <SelectContent>
                              {filteredLibrary.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-muted-foreground">مجموعات</label><Input type="number" dir="ltr" value={newExSets} onChange={(e) => setNewExSets(e.target.value)} /></div>
                            <div><label className="text-xs text-muted-foreground">تكرارات</label><Input type="number" dir="ltr" value={newExReps} onChange={(e) => setNewExReps(e.target.value)} /></div>
                            <div><label className="text-xs text-muted-foreground">الوزن</label><Input type="number" dir="ltr" value={newExWeight} onChange={(e) => setNewExWeight(e.target.value)} /></div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">رابط فيديو (اختياري)</label>
                            <Input type="url" dir="ltr" placeholder="https://youtube.com/..." value={newExVideoUrl} onChange={(e) => setNewExVideoUrl(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" disabled={!newExName || addExerciseMutation.isPending} onClick={() => addExerciseMutation.mutate({
                              dayId: day.id,
                              exercise: { name: newExName, sets: Number(newExSets), reps: Number(newExReps), weight: Number(newExWeight), video_url: newExVideoUrl, rest_seconds: 60, notes: "" },
                            })}>حفظ</Button>
                            <Button size="sm" variant="outline" onClick={() => { setAddExDay(null); resetExForm(); }}>إلغاء</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setAddExDay(day.id)}>
                          <Plus className="w-4 h-4 ml-1" />إضافة تمرين
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {copyProgram && (
            <CopyProgramModal
              open={!!copyProgramId}
              onOpenChange={(open) => { if (!open) setCopyProgramId(null); }}
              program={copyProgram}
              clients={clients as any}
              programs={programs}
            />
          )}
        </div>
      </TrainerLayout>
    );
  }

  // ===== CREATE PROGRAM FORM =====
  if (showCreate) {
    return (
      <TrainerLayout>
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">إنشاء برنامج جديد</h1>
            <Button variant="ghost" size="sm" onClick={resetForm}>إلغاء</Button>
          </div>

          {/* Quick Templates */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">بدء سريع من قالب</label>
            <div className="grid grid-cols-2 gap-2">
              {quickTemplates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => applyQuickTemplate(t)}
                  className="text-right p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.goal} • {t.level} • {t.weeks} أسابيع</p>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <Card className="p-4 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              المعلومات الأساسية
            </h2>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">اسم البرنامج</label>
              <Input placeholder="مثال: برنامج تضخيم - مبتدئ" value={programName} onChange={(e) => setProgramName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">الهدف</label>
                <Select value={programGoal} onValueChange={setProgramGoal}>
                  <SelectTrigger><SelectValue placeholder="اختر الهدف" /></SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">المستوى</label>
                <Select value={programLevel} onValueChange={setProgramLevel}>
                  <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">عدد الأسابيع</label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <SelectItem key={w} value={String(w)}>{w} {w === 1 ? "أسبوع" : "أسابيع"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">وصف البرنامج (اختياري)</label>
              <Textarea placeholder="وصف مختصر عن البرنامج وأهدافه..." value={programDescription} onChange={(e) => setProgramDescription(e.target.value)} rows={3} />
            </div>
          </Card>

          {/* Days Selection */}
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              أيام التدريب
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {weekDays.map((day) => (
                <label
                  key={day.key}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedDays.includes(day.key) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Checkbox checked={selectedDays.includes(day.key)} onCheckedChange={() => toggleDay(day.key)} />
                  <span className="text-sm text-foreground">{day.label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Days with Exercises */}
          {selectedDays.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary" />
                تمارين كل يوم
              </h2>
              {selectedDays.map((dayName) => {
                const exs = dayExercises[dayName] || [];
                const isExp = expandedDay === dayName;

                return (
                  <Card key={dayName} className="overflow-hidden">
                    <button onClick={() => setExpandedDay(isExp ? null : dayName)} className="w-full flex items-center justify-between p-4 text-right">
                      <div>
                        <h3 className="font-bold text-card-foreground">{dayName}</h3>
                        <p className="text-xs text-muted-foreground">{exs.length} تمارين</p>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isExp && (
                      <div className="border-t border-border p-4 space-y-2">
                        {exs.map((ex, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveExercise(dayName, idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button onClick={() => moveExercise(dayName, idx, "down")} disabled={idx === exs.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-secondary-foreground">
                                {ex.name}
                                {ex.video_url && (
                                  <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex mr-1.5 text-primary hover:text-primary/80">
                                    <Video className="w-4 h-4" />
                                  </a>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ex.sets} × {ex.reps}
                                {ex.weight > 0 && ` • ${ex.weight} كجم`}
                                {ex.rest_seconds > 0 && ` • راحة ${ex.rest_seconds}ث`}
                              </p>
                              {ex.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{ex.notes}</p>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => duplicateExercise(dayName, idx)} className="text-muted-foreground hover:text-primary">
                                <CopyPlus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeExerciseFromDay(dayName, idx)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add exercise form */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="ابحث عن تمرين..." value={exSearch} onChange={(e) => setExSearch(e.target.value)} className="pr-10" />
                          </div>
                          <Select value={newExName} onValueChange={setNewExName}>
                            <SelectTrigger><SelectValue placeholder="اختر تمرين" /></SelectTrigger>
                            <SelectContent>
                              {filteredLibrary.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-4 gap-2">
                            <div><label className="text-xs text-muted-foreground">مجموعات</label><Input type="number" dir="ltr" value={newExSets} onChange={(e) => setNewExSets(e.target.value)} /></div>
                            <div><label className="text-xs text-muted-foreground">تكرارات</label><Input type="number" dir="ltr" value={newExReps} onChange={(e) => setNewExReps(e.target.value)} /></div>
                            <div><label className="text-xs text-muted-foreground">الوزن (كجم)</label><Input type="number" dir="ltr" value={newExWeight} onChange={(e) => setNewExWeight(e.target.value)} /></div>
                            <div><label className="text-xs text-muted-foreground">راحة (ث)</label><Input type="number" dir="ltr" value={newExRest} onChange={(e) => setNewExRest(e.target.value)} /></div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">رابط فيديو (اختياري)</label>
                            <Input type="url" dir="ltr" placeholder="https://youtube.com/..." value={newExVideoUrl} onChange={(e) => setNewExVideoUrl(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">ملاحظات (اختياري)</label>
                            <Input placeholder="مثال: ركز على الفورم" value={newExNotes} onChange={(e) => setNewExNotes(e.target.value)} />
                          </div>
                          <Button size="sm" variant="outline" className="w-full" disabled={!newExName} onClick={() => addExerciseToDay(dayName)}>
                            <Plus className="w-4 h-4 ml-1" />إضافة التمرين
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Save */}
          <Button
            className="w-full py-6 text-base"
            disabled={createMutation.isPending || !programName.trim() || selectedDays.length === 0}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ البرنامج ✅"}
          </Button>
        </div>
      </TrainerLayout>
    );
  }

  // ===== PROGRAMS LIST =====
  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">البرامج التدريبية</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 ml-1" />برنامج جديد
          </Button>
        </div>

        <ProgramTemplates />

        <h2 className="text-lg font-bold text-foreground">برامجك</h2>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : programs.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground font-medium mb-1">لا توجد برامج بعد</p>
            <p className="text-sm text-muted-foreground mb-4">أنشئ برنامج أو استخدم قالب جاهز</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 ml-1" />إنشاء برنامج جديد
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <Card key={program.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="cursor-pointer" onClick={() => setViewProgramId(program.id)}>
                  <h3 className="font-bold text-card-foreground mb-2">{program.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{program.weeks} أسابيع</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{getClientCount(program.id)} متدرب</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-3 gap-1 text-xs w-full" onClick={(e) => { e.stopPropagation(); setCopyProgramId(program.id); }}>
                  <Copy className="w-3.5 h-3.5" />نسخ للعملاء
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Copy Program Modal */}
        {copyProgram && (
          <CopyProgramModal
            open={!!copyProgramId}
            onOpenChange={(open) => { if (!open) setCopyProgramId(null); }}
            program={copyProgram}
            clients={clients as any}
            programs={programs}
          />
        )}

        {/* Assign after creation modal */}
        {assignProgramId && (
          <CopyProgramModal
            open={!!assignProgramId}
            onOpenChange={(open) => { if (!open) setAssignProgramId(null); }}
            program={programs.find((p) => p.id === assignProgramId) || { id: assignProgramId, name: "البرنامج الجديد" }}
            clients={clients as any}
            programs={programs}
          />
        )}
      </div>
    </TrainerLayout>
  );
};

export default ProgramBuilder;
