import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ArrowRight, X, Flame, Dumbbell, Shield, HeartPulse, Swords,
  Zap, Target, Activity, Search,
} from "lucide-react";
import { GOALS, LEVELS, WEEK_DAYS, LocalDay, genId } from "./types";
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES, EQUIPMENT_OPTIONS, ProgramTemplate } from "./templates-data";

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
  equipment: string;
  setEquipment: (v: string) => void;
  onCancel: () => void;
  onProceed: () => void;
  onApplyTemplate: (t: ProgramTemplate) => void;
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

const TEMPLATE_ICONS: Record<string, typeof Flame> = {
  "t1": Shield, "t2": Flame, "t3": Dumbbell, "t4": Dumbbell,
  "t5": Target, "t6": HeartPulse, "t7": Zap, "t8": Activity,
};

const ProgramSetup = ({
  programName, setProgramName,
  programGoal, setProgramGoal,
  programLevel, setProgramLevel,
  weeks, setWeeks,
  programDesc, setProgramDesc,
  selectedDays, setSelectedDays,
  equipment, setEquipment,
  onCancel, onProceed, onApplyTemplate,
}: Props) => {
  const [templateCategory, setTemplateCategory] = useState("الكل");
  const [templateSearch, setTemplateSearch] = useState("");

  const filteredTemplates = ALL_TEMPLATES.filter(t => {
    if (templateCategory !== "الكل" && t.category !== templateCategory) return false;
    if (templateSearch && !t.name.includes(templateSearch) && !t.description.includes(templateSearch)) return false;
    return true;
  });

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

      {/* Templates Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-primary" strokeWidth={1.5} />قوالب علمية جاهزة
          <span className="text-[10px] text-muted-foreground font-normal">({ALL_TEMPLATES.length} قالب)</span>
        </h3>

        {/* Category Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TEMPLATE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setTemplateCategory(c.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                templateCategory === c.value
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:border-primary/20"
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Template Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredTemplates.map(t => {
            const Icon = TEMPLATE_ICONS[t.id] || Dumbbell;
            const activeDays = t.days.filter(d => !d.isRest);
            const totalExercises = activeDays.reduce((s, d) => s + d.exercises.length, 0);
            return (
              <button key={t.id} onClick={() => onApplyTemplate(t)}
                className="rounded-xl border border-border p-4 text-right hover:border-primary/40 hover:bg-primary/[0.02] transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.level}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.equipment}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground leading-tight">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{t.description}</p>
                <div className="flex gap-2 mt-2.5 text-[10px] text-muted-foreground">
                  <span>{t.weeks} أسابيع</span>
                  <span className="text-border">|</span>
                  <span>{t.daysPerWeek} أيام/أسبوع</span>
                  <span className="text-border">|</span>
                  <span>{totalExercises} تمرين</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">أو ابنِ من الصفر</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">اسم البرنامج</label>
          <Input placeholder="مثال: برنامج تخسيس متقدم..." value={programName}
            onChange={e => setProgramName(e.target.value)} className="text-base font-bold h-11" />
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
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">المعدات المتاحة</label>
          <div className="flex gap-2 flex-wrap">
            {EQUIPMENT_OPTIONS.map(eq => (
              <button key={eq} onClick={() => setEquipment(eq)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  equipment === eq
                    ? "bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}>
                {eq}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">
            المدة: <span className="text-primary font-bold">{weeks} أسبوع</span>
          </label>
          <Slider
            value={[weeks]}
            onValueChange={([v]) => setWeeks(v)}
            min={1}
            max={24}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>1</span><span>6</span><span>12</span><span>18</span><span>24</span>
          </div>
        </div>

        <Textarea placeholder="وصف البرنامج (اختياري)..." value={programDesc}
          onChange={e => setProgramDesc(e.target.value)} rows={2} className="text-sm" />

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
