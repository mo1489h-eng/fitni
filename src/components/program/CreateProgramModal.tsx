import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GOALS, LEVELS } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: {
    name: string;
    goal: string;
    level: string;
    weeks: number;
    daysPerWeek: number;
  }) => void;
}

const CreateProgramModal = ({ open, onOpenChange, onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), goal, level, weeks, daysPerWeek });
    setName("");
    setGoal("");
    setLevel("");
    setWeeks(8);
    setDaysPerWeek(4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base">برنامج جديد</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">اسم البرنامج</label>
            <Input
              placeholder="مثال: برنامج تخسيس متقدم"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">الهدف</label>
            <div className="flex flex-wrap gap-1.5">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(goal === g.value ? "" : g.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    goal === g.value ? g.color + " ring-1 ring-current" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {g.value}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">المستوى</label>
            <div className="flex gap-1.5">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(level === l.value ? "" : l.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    level === l.value ? l.color + " ring-1 ring-current" : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {l.value}
                </button>
              ))}
            </div>
          </div>

          {/* Weeks */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">المدة (أسابيع)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[4, 6, 8, 10, 12, 16].map(w => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold border transition-all ${
                    weeks === w
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {w}
                </button>
              ))}
              <Input
                type="number"
                min={1}
                max={24}
                value={weeks}
                onChange={e => setWeeks(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 h-10 text-center text-xs"
              />
            </div>
          </div>

          {/* Days per week */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">أيام التدريب بالأسبوع</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  onClick={() => setDaysPerWeek(d)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold border transition-all ${
                    daysPerWeek === d
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            إنشاء البرنامج
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProgramModal;
