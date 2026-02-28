import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, ChevronDown, ChevronUp, Trash2, Loader2, ClipboardList, Dumbbell, Calendar, Users,
} from "lucide-react";
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

interface LocalExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
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
  const [addExDay, setAddExDay] = useState<string | null>(null);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("10");
  const [newExWeight, setNewExWeight] = useState("0");

  // View state
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
  const [viewExpanded, setViewExpanded] = useState<string | null>(null);

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

  // Fetch clients for assignment count
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, program_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

      // 1. Create program
      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: user!.id, name: programName.trim(), weeks: Number(weeks) })
        .select()
        .single();
      if (pErr) throw pErr;

      // 2. Create days
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

      // 3. Create exercises for each day
      const exercisesToInsert: Array<{
        day_id: string;
        name: string;
        sets: number;
        reps: number;
        weight: number;
        exercise_order: number;
      }> = [];

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
          });
        });
      }

      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }

      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      resetForm();
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-days", viewProgramId] });
      setAddExDay(null);
      setNewExName("");
      setNewExSets("3");
      setNewExReps("10");
      setNewExWeight("0");
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setProgramName("");
    setWeeks("8");
    setSelectedDays([]);
    setDayExercises({});
    setExpandedDay(null);
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
        { name: newExName, sets: Number(newExSets) || 3, reps: Number(newExReps) || 10, weight: Number(newExWeight) || 0 },
      ],
    }));
    setNewExName("");
    setNewExSets("3");
    setNewExReps("10");
    setNewExWeight("0");
    setExpandedDay(null);
  };

  const removeExerciseFromDay = (day: string, idx: number) => {
    setDayExercises((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== idx),
    }));
  };

  const getClientCount = (programId: string) =>
    clients.filter((c) => c.program_id === programId).length;

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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(program.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              حذف
            </Button>
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
                  <button
                    onClick={() => setViewExpanded(isExp ? null : day.id)}
                    className="w-full flex items-center justify-between p-4 text-right"
                  >
                    <div>
                      <h3 className="font-bold text-card-foreground">{day.day_name}</h3>
                      <p className="text-xs text-muted-foreground">{exercises.length} تمارين</p>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExp && (
                    <div className="border-t border-border p-4 space-y-2">
                      {exercises.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">لا توجد تمارين</p>
                      )}
                      {exercises.map((ex: any) => (
                        <div key={ex.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                          <div>
                            <p className="font-medium text-secondary-foreground">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ex.sets} مجموعات × {ex.reps} تكرار
                              {ex.weight > 0 && ` • ${ex.weight} كجم`}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteExerciseMutation.mutate(ex.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Add exercise to existing day */}
                      {addExDay === day.id ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <Select value={newExName} onValueChange={setNewExName}>
                            <SelectTrigger><SelectValue placeholder="اختر تمرين" /></SelectTrigger>
                            <SelectContent>
                              {exerciseLibrary.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">مجموعات</label>
                              <Input type="number" dir="ltr" value={newExSets} onChange={(e) => setNewExSets(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">تكرارات</label>
                              <Input type="number" dir="ltr" value={newExReps} onChange={(e) => setNewExReps(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">الوزن</label>
                              <Input type="number" dir="ltr" value={newExWeight} onChange={(e) => setNewExWeight(e.target.value)} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={!newExName || addExerciseMutation.isPending}
                              onClick={() => addExerciseMutation.mutate({
                                dayId: day.id,
                                exercise: { name: newExName, sets: Number(newExSets), reps: Number(newExReps), weight: Number(newExWeight) },
                              })}
                            >
                              حفظ
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setAddExDay(null)}>إلغاء</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setAddExDay(day.id)}>
                          <Plus className="w-4 h-4 ml-1" />
                          إضافة تمرين
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
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

          {/* Program Name */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">اسم البرنامج</label>
            <Input
              placeholder="مثال: برنامج تضخيم - مبتدئ"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
          </div>

          {/* Weeks */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">عدد الأسابيع</label>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[4, 8, 12, 16].map((w) => (
                  <SelectItem key={w} value={String(w)}>{w} أسابيع</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days Selection */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">أيام التدريب</label>
            <div className="grid grid-cols-4 gap-2">
              {weekDays.map((day) => (
                <label
                  key={day.key}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedDays.includes(day.key) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={selectedDays.includes(day.key)}
                    onCheckedChange={() => toggleDay(day.key)}
                  />
                  <span className="text-sm text-foreground">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Days with Exercises */}
          {selectedDays.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">تمارين كل يوم</label>
              {selectedDays.map((dayName) => {
                const exs = dayExercises[dayName] || [];
                const isExp = expandedDay === dayName;

                return (
                  <Card key={dayName} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(isExp ? null : dayName)}
                      className="w-full flex items-center justify-between p-4 text-right"
                    >
                      <div>
                        <h3 className="font-bold text-card-foreground">{dayName}</h3>
                        <p className="text-xs text-muted-foreground">{exs.length} تمارين</p>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isExp && (
                      <div className="border-t border-border p-4 space-y-2">
                        {exs.map((ex, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                            <div>
                              <p className="font-medium text-secondary-foreground">{ex.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ex.sets} × {ex.reps}
                                {ex.weight > 0 && ` • ${ex.weight} كجم`}
                              </p>
                            </div>
                            <button onClick={() => removeExerciseFromDay(dayName, idx)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add exercise form */}
                        <div className="space-y-2 pt-2">
                          <Select value={newExName} onValueChange={setNewExName}>
                            <SelectTrigger><SelectValue placeholder="اختر تمرين" /></SelectTrigger>
                            <SelectContent>
                              {exerciseLibrary.map((name) => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">مجموعات</label>
                              <Input type="number" dir="ltr" value={newExSets} onChange={(e) => setNewExSets(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">تكرارات</label>
                              <Input type="number" dir="ltr" value={newExReps} onChange={(e) => setNewExReps(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">الوزن (كجم)</label>
                              <Input type="number" dir="ltr" value={newExWeight} onChange={(e) => setNewExWeight(e.target.value)} />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={!newExName}
                            onClick={() => addExerciseToDay(dayName)}
                          >
                            <Plus className="w-4 h-4 ml-1" />
                            إضافة التمرين
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
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">البرامج التدريبية</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 ml-1" />
            برنامج جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : programs.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-foreground font-medium mb-1">لا توجد برامج بعد</p>
            <p className="text-sm text-muted-foreground mb-4">أنشئ أول برنامج تدريبي لعملائك</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 ml-1" />
              إنشاء برنامج جديد
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <Card
                key={program.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setViewProgramId(program.id)}
              >
                <h3 className="font-bold text-card-foreground mb-2">{program.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {program.weeks} أسابيع
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {getClientCount(program.id)} متدرب
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default ProgramBuilder;
