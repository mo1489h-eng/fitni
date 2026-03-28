import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, X, Flame, Dumbbell, Shield, HeartPulse, Swords,
} from "lucide-react";
import { GOALS, LEVELS, WEEK_DAYS, LocalDay, LocalExercise, genId } from "./types";

interface Props {
  programName: string;
  setProgramName: (v: string) => void;
  programGoal: string;
  setProgramGoal: (v: string) => void;
  programLevel: string;
  setProgramLevel: (v: string) => void;
  weeks: number;
  setWeeks: (v: number) => void;
  programDesc: string;
  setProgramDesc: (v: string) => void;
  selectedDays: string[];
  setSelectedDays: (v: string[]) => void;
  onCancel: () => void;
  onProceed: () => void;
  onApplyTemplate: (t: TemplateData) => void;
}

export interface TemplateData {
  name: string;
  icon: typeof Flame;
  weeks: number;
  goal: string;
  level: string;
  desc: string;
  days: LocalDay[];
}

const DURATIONS = [4, 6, 8, 12, 16];

const templates: TemplateData[] = [
  {
    name: "تخسيس 8 أسابيع", icon: Flame, weeks: 8, goal: "تخسيس", level: "متوسط",
    desc: "كارديو + أوزان لحرق الدهون",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي + كارديو", warmup: [], exercises: [
        { id: genId(), name: "جري على السير", muscle: "كارديو", sets: 1, reps: 30, weight: 0, video_url: "", rest_seconds: 0, tempo: "", rpe: null, notes: "", is_warmup: false },
        { id: genId(), name: "سكوات باك", muscle: "أرجل", sets: 4, reps: 15, weight: 40, video_url: "", rest_seconds: 60, tempo: "2-0-1-0", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "بنش برس بار", muscle: "صدر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
      ]},
      { dayName: "اثنين", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "ثلاثاء", isRest: false, label: "ظهر + أكتاف", warmup: [], exercises: [
        { id: genId(), name: "سحب أمامي واسع", muscle: "ظهر", sets: 4, reps: 12, weight: 40, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "ضغط أكتاف دمبل", muscle: "أكتاف", sets: 3, reps: 12, weight: 20, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
      ]},
      { dayName: "أربعاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "خميس", isRest: false, label: "أرجل + صدر", warmup: [], exercises: [
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 12, weight: 60, video_url: "", rest_seconds: 60, tempo: "", rpe: 7, notes: "", is_warmup: false },
        { id: genId(), name: "تفتيح دمبل مسطح", muscle: "صدر", sets: 3, reps: 15, weight: 12, video_url: "", rest_seconds: 60, tempo: "", rpe: null, notes: "", is_warmup: false },
      ]},
      { dayName: "جمعة", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "سبت", isRest: true, label: "راحة", warmup: [], exercises: [] },
    ],
  },
  {
    name: "بناء عضلات 12 أسبوع", icon: Dumbbell, weeks: 12, goal: "بناء عضلات", level: "متقدم",
    desc: "سبليت متقدم لزيادة الكتلة العضلية",
    days: [
      { dayName: "أحد", isRest: false, label: "صدر + ترايسبس", warmup: [], exercises: [
        { id: genId(), name: "بنش برس بار", muscle: "صدر", sets: 4, reps: 8, weight: 60, video_url: "", rest_seconds: 120, tempo: "3-1-1-0", rpe: 8, notes: "", is_warmup: false },
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
      ]},
      { dayName: "خميس", isRest: false, label: "أرجل", warmup: [], exercises: [
        { id: genId(), name: "سكوات باك", muscle: "أرجل", sets: 4, reps: 8, weight: 80, video_url: "", rest_seconds: 180, tempo: "3-1-1-0", rpe: 9, notes: "تركيز على العمق", is_warmup: false },
        { id: genId(), name: "ليج برس", muscle: "أرجل", sets: 4, reps: 10, weight: 120, video_url: "", rest_seconds: 90, tempo: "", rpe: 8, notes: "", is_warmup: false },
        { id: genId(), name: "ديدليفت روماني", muscle: "أرجل", sets: 3, reps: 10, weight: 50, video_url: "", rest_seconds: 90, tempo: "3-0-1-0", rpe: 8, notes: "", is_warmup: false },
      ]},
      { dayName: "جمعة", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "سبت", isRest: true, label: "راحة", warmup: [], exercises: [] },
    ],
  },
  {
    name: "مبتدئ 4 أسابيع", icon: Shield, weeks: 4, goal: "لياقة عامة", level: "مبتدئ",
    desc: "فول بادي مناسب للمبتدئين",
    days: [
      { dayName: "أحد", isRest: false, label: "فول بادي A", warmup: [], exercises: [
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
      { dayName: "أربعاء", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "خميس", isRest: false, label: "فول بادي C", warmup: [], exercises: [
        { id: genId(), name: "ضغط أكتاف دمبل", muscle: "أكتاف", sets: 3, reps: 12, weight: 12, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
        { id: genId(), name: "ديدليفت روماني", muscle: "أرجل", sets: 3, reps: 12, weight: 30, video_url: "", rest_seconds: 60, tempo: "", rpe: 6, notes: "", is_warmup: false },
      ]},
      { dayName: "جمعة", isRest: true, label: "راحة", warmup: [], exercises: [] },
      { dayName: "سبت", isRest: true, label: "راحة", warmup: [], exercises: [] },
    ],
  },
];

const ProgramSetup = ({
  programName, setProgramName,
  programGoal, setProgramGoal,
  programLevel, setProgramLevel,
  weeks, setWeeks,
  programDesc, setProgramDesc,
  selectedDays, setSelectedDays,
  onCancel, onProceed, onApplyTemplate,
}: Props) => {
  const toggleDay = (day: string) => {
    setSelectedDays(
      selectedDays.includes(day)
        ? selectedDays.filter(d => d !== day)
        : [...selectedDays, day]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">إنشاء برنامج جديد</h1>
          <p className="text-xs text-muted-foreground mt-0.5">الخطوة 1: المعلومات الأساسية</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Templates */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-primary" strokeWidth={1.5} />ابدأ من قالب جاهز
        </h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
          {templates.map(t => (
            <button key={t.name} onClick={() => onApplyTemplate(t)}
              className="flex-shrink-0 w-44 rounded-xl border border-border p-3.5 text-right hover:border-primary/50 hover:bg-primary/[0.03] transition-all group">
              <t.icon className="w-5 h-5 text-primary mb-1.5" strokeWidth={1.5} />
              <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              <div className="flex gap-1.5 mt-2 text-[9px] text-muted-foreground">
                <span>{t.weeks} أسابيع</span><span>|</span>
                <span>{t.days.filter(d => !d.isRest).length} أيام</span>
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

        <Textarea placeholder="وصف البرنامج (اختياري)..." value={programDesc}
          onChange={e => setProgramDesc(e.target.value)} rows={2} />

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">أيام التدريب</label>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map(day => {
              const selected = selectedDays.includes(day);
              return (
                <button key={day} onClick={() => toggleDay(day)}
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

      {/* Bottom Bar */}
      <div className="sticky bottom-16 bg-card border border-border rounded-xl p-3 flex gap-2 shadow-lg z-40">
        <Button variant="outline" className="flex-1" onClick={onCancel}>إلغاء</Button>
        <Button className="flex-1 gap-1" onClick={onProceed}
          disabled={!programName.trim() || selectedDays.length === 0}>
          التالي: بناء التمارين <ArrowRight className="w-4 h-4 rotate-180" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
};

export default ProgramSetup;
