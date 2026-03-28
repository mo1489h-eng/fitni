import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Check, Dumbbell, Clock, Loader2, X,
} from "lucide-react";
import {
  ExerciseDBItem, getArabicName, getArabicBodyPart, getArabicTarget,
  getArabicEquipment, BODY_PART_CONFIG,
} from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";

export interface SelectedExercise {
  id: string;
  name_en: string;
  name_ar: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (exercises: SelectedExercise[]) => void;
}

const BODY_PARTS = [
  "back", "cardio", "chest", "lower arms", "lower legs",
  "neck", "shoulders", "upper arms", "upper legs", "waist",
];

const ExerciseLibraryPanel = ({ open, onClose, onAdd }: Props) => {
  const [tab, setTab] = useState<"search" | "bodypart" | "recent">("search");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [recentExercises, setRecentExercises] = useState<ExerciseDBItem[]>([]);
  const [detailExercise, setDetailExercise] = useState<ExerciseDBItem | null>(null);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("recent-exercises");
      if (stored) {
        try { setRecentExercises(JSON.parse(stored)); } catch {}
      }
      setSelectedIds(new Set());
      setSearch("");
      setSelectedBodyPart(null);
      setDetailExercise(null);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchExercises = useCallback(async (
    query?: string, bodyPart?: string, newOffset = 0, append = false
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", offset: String(newOffset) });
      if (bodyPart) {
        params.set("endpoint", "byBodyPart");
        params.set("bodyPart", bodyPart);
      } else if (query && query.length >= 2) {
        params.set("endpoint", "byName");
        params.set("name", query.toLowerCase());
      } else {
        params.set("endpoint", "exercises");
      }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/exercisedb-proxy?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      if (!response.ok) throw new Error("API Error");
      const result = await response.json();
      if (Array.isArray(result)) {
        setExercises(prev => append ? [...prev, ...result] : result);
        setHasMore(result.length >= 30);
        setOffset(newOffset + result.length);
      }
    } catch (err) {
      console.error("ExerciseDB fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (tab === "search") {
      if (debouncedSearch.length >= 2) fetchExercises(debouncedSearch);
      else if (debouncedSearch.length === 0) fetchExercises();
    }
  }, [debouncedSearch, open, tab, fetchExercises]);

  useEffect(() => {
    if (selectedBodyPart) fetchExercises(undefined, selectedBodyPart);
  }, [selectedBodyPart, fetchExercises]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && hasMore && !loading) {
      if (tab === "search") fetchExercises(debouncedSearch || undefined, undefined, offset, true);
      else if (tab === "bodypart" && selectedBodyPart) fetchExercises(undefined, selectedBodyPart, offset, true);
    }
  }, [hasMore, loading, offset, tab, debouncedSearch, selectedBodyPart, fetchExercises]);

  const toggleSelect = (ex: ExerciseDBItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.add(ex.id);
      return next;
    });
  };

  const handleAdd = () => {
    const allExercises = [...exercises, ...recentExercises];
    const selected = allExercises.filter(e => selectedIds.has(e.id));
    const unique = selected.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);

    const mapped: SelectedExercise[] = unique.map(e => ({
      id: e.id, name_en: e.name, name_ar: getArabicName(e.name),
      bodyPart: e.bodyPart, target: e.target, equipment: e.equipment,
      gifUrl: e.gifUrl, secondaryMuscles: e.secondaryMuscles, instructions: e.instructions,
    }));

    // Save to recent
    const recent = [...unique, ...recentExercises].filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i).slice(0, 20);
    localStorage.setItem("recent-exercises", JSON.stringify(recent));

    onAdd(mapped);
    setSelectedIds(new Set());
    onClose();
  };

  const renderExerciseRow = (ex: ExerciseDBItem) => {
    const isSelected = selectedIds.has(ex.id);
    const arName = getArabicName(ex.name);
    const config = BODY_PART_CONFIG[ex.bodyPart] || { color: "bg-muted text-muted-foreground" };

    return (
      <div
        key={ex.id}
        className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
          isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
        }`}
        onClick={() => toggleSelect(ex)}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
          <img
            src={getProxiedImageUrl(ex.gifUrl)}
            alt={ex.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const sibling = e.currentTarget.nextElementSibling as HTMLElement;
              if (sibling) sibling.style.display = 'flex';
            }}
          />
          <div
            style={{ display: 'none' }}
            className="w-full h-full rounded-lg bg-primary/20 text-primary-foreground items-center justify-center text-lg font-bold absolute inset-0"
          >
            {ex.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-foreground truncate">{arName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{ex.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${config.color}`}>
              {getArabicBodyPart(ex.bodyPart)}
            </Badge>
            <span className="text-[9px] text-muted-foreground">{getArabicEquipment(ex.equipment)}</span>
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? "bg-primary border-primary" : "border-border"
        }`}>
          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
        </div>
      </div>
    );
  };

  if (!open) return null;

  // Detail view
  if (detailExercise) {
    const ex = detailExercise;
    return (
      <div className="h-full flex flex-col bg-card border-r border-border" dir="rtl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => setDetailExercise(null)} className="text-sm text-primary font-medium">رجوع</button>
          <span className="text-sm font-bold">{getArabicName(ex.name)}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
             <div className="rounded-xl overflow-hidden bg-muted aspect-square max-w-[280px] mx-auto relative">
               <img
                 src={getProxiedImageUrl(ex.gifUrl)}
                 alt={ex.name}
                 className="w-full h-full object-contain"
                 onError={(e) => {
                   e.currentTarget.style.display = 'none';
                   const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                   if (sibling) sibling.style.display = 'flex';
                 }}
               />
               <div
                 style={{ display: 'none' }}
                 className="w-full h-full bg-primary/20 text-primary-foreground items-center justify-center text-5xl font-bold absolute inset-0"
               >
                 {ex.name.charAt(0).toUpperCase()}
               </div>
             </div>
            <div>
              <p className="text-lg font-bold text-foreground">{getArabicName(ex.name)}</p>
              <p className="text-sm text-muted-foreground">{ex.name}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className={BODY_PART_CONFIG[ex.bodyPart]?.color || ""}>{getArabicBodyPart(ex.bodyPart)}</Badge>
              <Badge variant="secondary">{getArabicTarget(ex.target)}</Badge>
              <Badge variant="outline">{getArabicEquipment(ex.equipment)}</Badge>
            </div>
            {ex.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">العضلات المساعدة</p>
                <div className="flex gap-1 flex-wrap">
                  {ex.secondaryMuscles.map(m => (
                    <Badge key={m} variant="outline" className="text-[10px]">{getArabicTarget(m)}</Badge>
                  ))}
                </div>
              </div>
            )}
            {ex.instructions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">خطوات التنفيذ</p>
                <ol className="space-y-2">
                  {ex.instructions.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="text-primary font-bold text-xs mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <Button className="w-full" onClick={() => { toggleSelect(ex); setDetailExercise(null); }}>
              إضافة للتمرين
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border-r border-border" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" strokeWidth={1.5} />
            إضافة تمرين
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {([
            { key: "search", label: "بحث", icon: Search },
            { key: "bodypart", label: "عضلة", icon: Dumbbell },
            { key: "recent", label: "الأخيرة", icon: Clock },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedBodyPart(null); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-3 h-3" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "search" && (
          <>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ابحث بالعربي أو الإنجليزي..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-10 h-9"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{exercises.length} نتيجة</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" onScroll={handleScroll}>
              {exercises.map(renderExerciseRow)}
              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              {!loading && exercises.length === 0 && debouncedSearch.length >= 2 && (
                <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
              )}
            </div>
          </>
        )}

        {tab === "bodypart" && !selectedBodyPart && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {BODY_PARTS.map(bp => {
              const config = BODY_PART_CONFIG[bp] || { color: "bg-muted text-muted-foreground" };
              return (
                <button key={bp} onClick={() => setSelectedBodyPart(bp)}
                  className={`p-4 rounded-xl border border-border hover:border-primary/30 transition-all text-center ${config.color}`}>
                  <Dumbbell className="w-6 h-6 mx-auto mb-1.5" strokeWidth={1.5} />
                  <p className="text-sm font-bold">{getArabicBodyPart(bp)}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{bp}</p>
                </button>
              );
            })}
          </div>
        )}

        {tab === "bodypart" && selectedBodyPart && (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <button onClick={() => { setSelectedBodyPart(null); setExercises([]); }}
                className="text-xs text-primary font-medium">رجوع</button>
              <p className="text-sm font-bold">{getArabicBodyPart(selectedBodyPart)}</p>
              <p className="text-[10px] text-muted-foreground">{exercises.length} تمرين</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" onScroll={handleScroll}>
              {exercises.map(renderExerciseRow)}
              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          </>
        )}

        {tab === "recent" && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {recentExercises.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد تمارين حديثة</p>
              </div>
            ) : (
              recentExercises.map(renderExerciseRow)
            )}
          </div>
        )}
      </div>

      {/* Bottom Add Button */}
      {selectedIds.size > 0 && (
        <div className="p-3 border-t border-border">
          <Button className="w-full gap-2" onClick={handleAdd}>
            <Check className="w-4 h-4" />
            إضافة {selectedIds.size} تمرين
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExerciseLibraryPanel;
