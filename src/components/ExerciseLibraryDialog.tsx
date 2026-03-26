import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Dumbbell, Filter } from "lucide-react";

const MUSCLE_GROUPS = ["الكل", "صدر", "ظهر", "أكتاف", "أرجل", "بايسبس", "ترايسبس", "كور", "كارديو"];
const EQUIPMENT = ["الكل", "بدون معدات", "بار", "دمبل", "كيبل", "آلة", "كيتل بيل", "سميث"];
const DIFFICULTIES = ["الكل", "مبتدئ", "متوسط", "متقدم"];

export const MUSCLE_COLORS: Record<string, string> = {
  "صدر": "bg-red-500/15 text-red-400 border-red-500/20",
  "أرجل": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "ظهر": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "أكتاف": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "بايسبس": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "ترايسبس": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "كور": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "كارديو": "bg-primary/15 text-primary border-primary/20",
};

export interface ExerciseLibraryItem {
  id: string;
  name_ar: string;
  name_en: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  movement_pattern: string | null;
  video_url: string | null;
  secondary_muscles: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: ExerciseLibraryItem) => void;
  title?: string;
}

const ExerciseLibraryDialog = ({ open, onOpenChange, onSelect, title = "إضافة تمرين" }: Props) => {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("الكل");
  const [equipmentFilter, setEquipmentFilter] = useState("الكل");
  const [difficultyFilter, setDifficultyFilter] = useState("الكل");
  const [showFilters, setShowFilters] = useState(false);

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercise-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_library")
        .select("*")
        .order("muscle_group")
        .order("name_ar");
      if (error) throw error;
      return data as ExerciseLibraryItem[];
    },
  });

  const filtered = useMemo(() => {
    let list = exercises;
    if (muscleFilter !== "الكل") list = list.filter(e => e.muscle_group === muscleFilter);
    if (equipmentFilter !== "الكل") list = list.filter(e => e.equipment === equipmentFilter);
    if (difficultyFilter !== "الكل") list = list.filter(e => e.difficulty === difficultyFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e =>
        e.name_ar.includes(s) || e.name_en.toLowerCase().includes(s) || e.muscle_group.includes(s)
      );
    }
    return list;
  }, [exercises, muscleFilter, equipmentFilter, difficultyFilter, search]);

  // Group by muscle
  const grouped = useMemo(() => {
    const map: Record<string, ExerciseLibraryItem[]> = {};
    filtered.forEach(e => {
      if (!map[e.muscle_group]) map[e.muscle_group] = [];
      map[e.muscle_group].push(e);
    });
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" strokeWidth={1.5} />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder="ابحث بالعربي أو الإنجليزي..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Muscle Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setMuscleFilter(g)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                muscleFilter === g
                  ? g === "الكل" ? "bg-primary/10 text-primary border-primary/20" : (MUSCLE_COLORS[g] || "bg-primary/10 text-primary border-primary/20")
                  : "border-border text-muted-foreground hover:border-primary/20"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
          فلتر متقدم
          {(equipmentFilter !== "الكل" || difficultyFilter !== "الكل") && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>

        {showFilters && (
          <div className="space-y-2 pb-2 border-b border-border">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">المعدات</p>
              <div className="flex gap-1 flex-wrap">
                {EQUIPMENT.map(eq => (
                  <button key={eq} onClick={() => setEquipmentFilter(eq)}
                    className={`px-2 py-1 rounded text-[10px] border transition-all ${
                      equipmentFilter === eq ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground"
                    }`}>
                    {eq}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">المستوى</p>
              <div className="flex gap-1">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDifficultyFilter(d)}
                    className={`px-2 py-1 rounded text-[10px] border transition-all ${
                      difficultyFilter === d ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-[10px] text-muted-foreground">{filtered.length} تمرين</p>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد نتائج</p>
          ) : (
            Object.entries(grouped).map(([muscle, exs]) => (
              <div key={muscle}>
                <p className="text-[10px] font-bold text-muted-foreground mb-1.5 sticky top-0 bg-popover z-10 py-1">
                  {muscle} ({exs.length})
                </p>
                <div className="space-y-0.5">
                  {exs.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => { onSelect(ex); onOpenChange(false); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-right group"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${MUSCLE_COLORS[ex.muscle_group] || "bg-muted"}`}>
                        <Dumbbell className="w-4 h-4" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ex.name_ar}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{ex.name_en}</span>
                          <span className="text-[10px] text-muted-foreground/50">|</span>
                          <span className="text-[10px] text-muted-foreground">{ex.equipment}</span>
                          <span className="text-[10px] text-muted-foreground/50">|</span>
                          <span className="text-[10px] text-muted-foreground">{ex.difficulty}</span>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseLibraryDialog;
