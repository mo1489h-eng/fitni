import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Flame, Dumbbell, Shield, HeartPulse, Swords, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

interface TemplateDay {
  dayName: string;
  exercises: { name: string; sets: number; reps: number; weight: number }[];
}

interface Template {
  name: string;
  icon: typeof Flame;
  weeks: number;
  daysPerWeek: number;
  description: string;
  days: TemplateDay[];
}

const templates: Template[] = [
  {
    name: "تخسيس وحرق دهون",
    icon: Flame,
    weeks: 8,
    daysPerWeek: 3,
    description: "برنامج كارديو + أوزان لحرق الدهون بشكل فعال",
    days: [
      {
        dayName: "أحد",
        exercises: [
          { name: "كارديو - جري", sets: 1, reps: 30, weight: 0 },
          { name: "سكوات", sets: 4, reps: 15, weight: 40 },
          { name: "ليج برس", sets: 3, reps: 15, weight: 60 },
          { name: "لانجز", sets: 3, reps: 12, weight: 20 },
          { name: "كرنش", sets: 3, reps: 20, weight: 0 },
        ],
      },
      {
        dayName: "ثلاثاء",
        exercises: [
          { name: "كارديو - دراجة", sets: 1, reps: 20, weight: 0 },
          { name: "بنش برس", sets: 4, reps: 12, weight: 40 },
          { name: "تفتيح دمبل", sets: 3, reps: 15, weight: 12 },
          { name: "ضغط أكتاف", sets: 3, reps: 12, weight: 20 },
          { name: "بلانك", sets: 3, reps: 45, weight: 0 },
        ],
      },
      {
        dayName: "خميس",
        exercises: [
          { name: "كارديو - مشي", sets: 1, reps: 40, weight: 0 },
          { name: "سحب أمامي", sets: 4, reps: 12, weight: 40 },
          { name: "تجديف دمبل", sets: 3, reps: 12, weight: 15 },
          { name: "بايسبس كيرل", sets: 3, reps: 15, weight: 10 },
          { name: "ليج ريز", sets: 3, reps: 15, weight: 0 },
        ],
      },
    ],
  },
  {
    name: "بناء العضلات",
    icon: Dumbbell,
    weeks: 12,
    daysPerWeek: 4,
    description: "برنامج سبليت متقدم لزيادة الكتلة العضلية",
    days: [
      {
        dayName: "أحد",
        exercises: [
          { name: "بنش برس", sets: 4, reps: 8, weight: 60 },
          { name: "بنش برس مائل", sets: 4, reps: 10, weight: 50 },
          { name: "تفتيح دمبل", sets: 3, reps: 12, weight: 16 },
          { name: "ديبس", sets: 3, reps: 10, weight: 0 },
          { name: "ترايسبس بوش داون", sets: 3, reps: 12, weight: 25 },
        ],
      },
      {
        dayName: "اثنين",
        exercises: [
          { name: "سحب أمامي", sets: 4, reps: 10, weight: 50 },
          { name: "تجديف بار", sets: 4, reps: 8, weight: 50 },
          { name: "سحب خلفي", sets: 3, reps: 12, weight: 40 },
          { name: "بايسبس بار", sets: 3, reps: 10, weight: 25 },
          { name: "هامر كيرل", sets: 3, reps: 12, weight: 14 },
        ],
      },
      {
        dayName: "أربعاء",
        exercises: [
          { name: "ضغط أكتاف", sets: 4, reps: 10, weight: 40 },
          { name: "رفرفة جانبية", sets: 4, reps: 15, weight: 10 },
          { name: "رفرفة أمامية", sets: 3, reps: 12, weight: 10 },
          { name: "شرق", sets: 4, reps: 15, weight: 12 },
        ],
      },
      {
        dayName: "خميس",
        exercises: [
          { name: "سكوات", sets: 4, reps: 8, weight: 80 },
          { name: "ليج برس", sets: 4, reps: 10, weight: 120 },
          { name: "ليج كيرل", sets: 3, reps: 12, weight: 35 },
          { name: "ليج اكستنشن", sets: 3, reps: 12, weight: 35 },
          { name: "ديدليفت روماني", sets: 3, reps: 10, weight: 50 },
        ],
      },
    ],
  },
  {
    name: "مبتدئ شامل",
    icon: Shield,
    weeks: 4,
    daysPerWeek: 3,
    description: "برنامج فول بادي مناسب للمبتدئين",
    days: [
      {
        dayName: "أحد",
        exercises: [
          { name: "بنش برس", sets: 3, reps: 12, weight: 30 },
          { name: "سكوات", sets: 3, reps: 12, weight: 30 },
          { name: "سحب أمامي", sets: 3, reps: 12, weight: 30 },
          { name: "ضغط أكتاف", sets: 3, reps: 12, weight: 15 },
          { name: "كرنش", sets: 3, reps: 15, weight: 0 },
        ],
      },
      {
        dayName: "ثلاثاء",
        exercises: [
          { name: "ليج برس", sets: 3, reps: 12, weight: 60 },
          { name: "تفتيح دمبل", sets: 3, reps: 12, weight: 10 },
          { name: "تجديف دمبل", sets: 3, reps: 12, weight: 12 },
          { name: "بايسبس كيرل", sets: 3, reps: 12, weight: 8 },
          { name: "بلانك", sets: 3, reps: 30, weight: 0 },
        ],
      },
      {
        dayName: "خميس",
        exercises: [
          { name: "بوش أب", sets: 3, reps: 10, weight: 0 },
          { name: "لانجز", sets: 3, reps: 10, weight: 10 },
          { name: "رفرفة جانبية", sets: 3, reps: 15, weight: 6 },
          { name: "ترايسبس بوش داون", sets: 3, reps: 12, weight: 15 },
          { name: "ليج ريز", sets: 3, reps: 12, weight: 0 },
        ],
      },
    ],
  },
  {
    name: "تحسين اللياقة",
    icon: HeartPulse,
    weeks: 6,
    daysPerWeek: 4,
    description: "تدريب وظيفي لتحسين اللياقة البدنية العامة",
    days: [
      {
        dayName: "أحد",
        exercises: [
          { name: "كارديو - جري", sets: 1, reps: 20, weight: 0 },
          { name: "سكوات", sets: 4, reps: 15, weight: 40 },
          { name: "بوش أب", sets: 4, reps: 12, weight: 0 },
          { name: "بلانك", sets: 3, reps: 60, weight: 0 },
        ],
      },
      {
        dayName: "اثنين",
        exercises: [
          { name: "كارديو - دراجة", sets: 1, reps: 25, weight: 0 },
          { name: "ديدليفت", sets: 4, reps: 10, weight: 50 },
          { name: "سحب أمامي", sets: 3, reps: 12, weight: 35 },
          { name: "روسيان تويست", sets: 3, reps: 20, weight: 5 },
        ],
      },
      {
        dayName: "أربعاء",
        exercises: [
          { name: "كارديو - مشي", sets: 1, reps: 30, weight: 0 },
          { name: "لانجز", sets: 4, reps: 12, weight: 15 },
          { name: "ضغط أكتاف", sets: 3, reps: 12, weight: 20 },
          { name: "كرنش", sets: 4, reps: 20, weight: 0 },
        ],
      },
      {
        dayName: "خميس",
        exercises: [
          { name: "كارديو - جري", sets: 1, reps: 15, weight: 0 },
          { name: "سكوات أمامي", sets: 3, reps: 12, weight: 30 },
          { name: "بنش برس", sets: 3, reps: 12, weight: 40 },
          { name: "ليج ريز", sets: 3, reps: 15, weight: 0 },
        ],
      },
    ],
  },
  {
    name: "رياضات قتالية",
    icon: Swords,
    weeks: 8,
    daysPerWeek: 5,
    description: "قوة + كارديو عالي الشدة للرياضات القتالية",
    days: [
      {
        dayName: "أحد",
        exercises: [
          { name: "ديدليفت", sets: 4, reps: 6, weight: 80 },
          { name: "سكوات", sets: 4, reps: 8, weight: 70 },
          { name: "بلانك", sets: 3, reps: 60, weight: 0 },
        ],
      },
      {
        dayName: "اثنين",
        exercises: [
          { name: "كارديو - جري", sets: 1, reps: 25, weight: 0 },
          { name: "بوش أب", sets: 4, reps: 20, weight: 0 },
          { name: "روسيان تويست", sets: 4, reps: 25, weight: 8 },
        ],
      },
      {
        dayName: "ثلاثاء",
        exercises: [
          { name: "بنش برس", sets: 4, reps: 8, weight: 50 },
          { name: "سحب أمامي", sets: 4, reps: 10, weight: 45 },
          { name: "ضغط أكتاف", sets: 3, reps: 10, weight: 30 },
        ],
      },
      {
        dayName: "أربعاء",
        exercises: [
          { name: "كارديو - دراجة", sets: 1, reps: 30, weight: 0 },
          { name: "لانجز", sets: 4, reps: 12, weight: 20 },
          { name: "كرنش", sets: 4, reps: 25, weight: 0 },
          { name: "ليج ريز", sets: 3, reps: 15, weight: 0 },
        ],
      },
      {
        dayName: "خميس",
        exercises: [
          { name: "ديدليفت روماني", sets: 4, reps: 8, weight: 60 },
          { name: "تجديف بار", sets: 4, reps: 10, weight: 45 },
          { name: "بايسبس بار", sets: 3, reps: 12, weight: 20 },
          { name: "بلانك", sets: 3, reps: 45, weight: 0 },
        ],
      },
    ],
  },
];

const ProgramTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const useTemplate = async (template: Template) => {
    if (!user) return;
    setLoading(template.name);
    try {
      // 1. Create program
      const { data: program, error: pErr } = await supabase
        .from("programs")
        .insert({ trainer_id: user.id, name: template.name, weeks: template.weeks })
        .select()
        .single();
      if (pErr) throw pErr;

      // 2. Create days
      const daysToInsert = template.days.map((d, i) => ({
        program_id: program.id,
        day_name: d.dayName,
        day_order: i,
      }));
      const { data: days, error: dErr } = await supabase
        .from("program_days")
        .insert(daysToInsert)
        .select();
      if (dErr) throw dErr;

      // 3. Create exercises
      const exercisesToInsert: any[] = [];
      for (const day of days) {
        const templateDay = template.days.find((d) => d.dayName === day.day_name);
        if (templateDay) {
          templateDay.exercises.forEach((ex, idx) => {
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
      }
      if (exercisesToInsert.length > 0) {
        const { error: eErr } = await supabase.from("program_exercises").insert(exercisesToInsert);
        if (eErr) throw eErr;
      }

      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: `تم إضافة "${template.name}" لبرامجك` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        قوالب جاهزة
      </h2>
      <p className="text-sm text-muted-foreground">ابدأ بسرعة مع برامج جاهزة يمكنك تخصيصها</p>

      <div className="grid grid-cols-1 gap-3">
        {templates.map((t) => {
          const isExpanded = expanded === t.name;
          return (
            <Card key={t.name} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-card-foreground">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{t.weeks} أسابيع</span>
                      <span>{t.daysPerWeek} أيام/أسبوع</span>
                      <span>{t.days.reduce((s, d) => s + d.exercises.length, 0)} تمرين</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={loading === t.name}
                    onClick={() => useTemplate(t)}
                  >
                    {loading === t.name ? <Loader2 className="w-4 h-4 animate-spin" /> : "استخدم القالب"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpanded(isExpanded ? null : t.name)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-3 bg-secondary/30">
                  {t.days.map((day) => (
                    <div key={day.dayName}>
                      <p className="text-sm font-bold text-card-foreground mb-1">{day.dayName}</p>
                      <div className="space-y-1">
                        {day.exercises.map((ex, i) => (
                          <div key={i} className="text-xs text-muted-foreground flex justify-between bg-card rounded px-2 py-1.5">
                            <span className="text-secondary-foreground font-medium">{ex.name}</span>
                            <span>{ex.sets}×{ex.reps} {ex.weight > 0 && `• ${ex.weight}كجم`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProgramTemplates;
