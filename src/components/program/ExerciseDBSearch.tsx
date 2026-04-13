import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Check, Dumbbell, Clock, Loader2,
} from "lucide-react";
import {
  ExerciseDBItem, getArabicName, getArabicBodyPart, getArabicTarget,
  getArabicEquipment, BODY_PART_CONFIG,
} from "@/lib/exercise-translations";
import {
  searchLocalExercises,
  filterLocalByBodyPart,
  mergeExerciseListsPreferLocal,
} from "@/lib/localExercisesDb";
import { normalizeProxyExerciseToItem } from "@/lib/exercise-library-service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercises: SelectedExercise[]) => void;
}

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

const BODY_PARTS = [
  "back", "cardio", "chest", "lower arms", "lower legs",
  "neck", "shoulders", "upper arms", "upper legs", "waist",
];

const ExerciseDBSearch = ({ open, onOpenChange, onSelect }: Props) => {
  const [tab, setTab] = useState("search");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [detailExercise, setDetailExercise] = useState<ExerciseDBItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [recentExercises, setRecentExercises] = useState<ExerciseDBItem[]>([]);

  // Load recent from localStorage
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("recent-exercises");
      if (stored) {
        try { setRecentExercises(JSON.parse(stored)); } catch {}
      }
    }
  }, [open]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchExercises = useCallback(async (
    query?: string, bodyPart?: string, newOffset = 0, append = false
  ) => {
    setLoading(true);
    try {
      let localFirst: ExerciseDBItem[] = [];
      if (!append) {
        if (bodyPart) {
          localFirst = filterLocalByBodyPart(bodyPart);
        } else if (query && query.trim().length >= 1) {
          localFirst = searchLocalExercises(query, 80);
        } else {
          localFirst = searchLocalExercises("", 40);
        }
        setExercises(localFirst);
      }

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
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!response.ok) throw new Error("API Error");
      const result = await response.json();
      const raw = Array.isArray(result) ? result : [];
      const remote: ExerciseDBItem[] = raw
        .map((row) => normalizeProxyExerciseToItem(row))
        .filter((x): x is ExerciseDBItem => x != null);

      if (append) {
        setExercises((prev) => mergeExerciseListsPreferLocal(prev, remote));
        setHasMore(remote.length >= 30);
        setOffset(newOffset + remote.length);
      } else {
        setExercises(mergeExerciseListsPreferLocal(localFirst, remote));
        setHasMore(remote.length >= 30);
        setOffset(newOffset + remote.length);
      }
    } catch (err) {
      console.error("ExerciseDB fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search trigger
  useEffect(() => {
    if (!open) return;
    if (tab === "search") {
      if (debouncedSearch.length >= 1) {
        fetchExercises(debouncedSearch);
      } else {
        fetchExercises();
      }
    }
  }, [debouncedSearch, open, tab, fetchExercises]);

  // Body part selection
  useEffect(() => {
    if (selectedBodyPart) {
      fetchExercises(undefined, selectedBodyPart);
    }
  }, [selectedBodyPart, fetchExercises]);

  // Load more on scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && hasMore && !loading) {
      if (tab === "search") {
        fetchExercises(debouncedSearch || undefined, undefined, offset, true);
      } else if (tab === "bodypart" && selectedBodyPart) {
        fetchExercises(undefined, selectedBodyPart, offset, true);
      }
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
    const selected = exercises
      .filter(e => selectedIds.has(e.id))
      .concat(recentExercises.filter(e => selectedIds.has(e.id)));

    const mapped: SelectedExercise[] = selected.map(e => ({
      id: e.id,
      name_en: e.name,
      name_ar: getArabicName(e.name),
      bodyPart: e.bodyPart,
      target: e.target,
      equipment: e.equipment,
      gifUrl: e.gifUrl,
      secondaryMuscles: e.secondaryMuscles,
      instructions: e.instructions,
    }));

    // Save to recent
    const recent = [...mapped.map(m => exercises.find(e => e.id === m.id) || recentExercises.find(e => e.id === m.id)).filter(Boolean) as ExerciseDBItem[], ...recentExercises];
    const uniqueRecent = recent.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i).slice(0, 20);
    localStorage.setItem("recent-exercises", JSON.stringify(uniqueRecent));

    onSelect(mapped);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const renderExerciseRow = (ex: ExerciseDBItem) => {
    const isSelected = selectedIds.has(ex.id);
    const arName = ex.name_ar ?? getArabicName(ex.name);
    const config = BODY_PART_CONFIG[ex.bodyPart] || { color: "bg-muted text-muted-foreground" };

    return (
      <div
        key={ex.id}
        className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
          isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
        }`}
        onClick={() => toggleSelect(ex)}
      >
        {/* GIF Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {ex.gifUrl ? (
            <img
              src={ex.gifUrl}
              alt={ex.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Dumbbell className="w-7 h-7 text-muted-foreground/50" strokeWidth={1.5} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-foreground truncate">{arName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{ex.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${config.color}`}>
              {getArabicBodyPart(ex.bodyPart)}
            </Badge>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {getArabicTarget(ex.target)}
            </Badge>
            <span className="text-[9px] text-muted-foreground">{getArabicEquipment(ex.equipment)}</span>
          </div>
        </div>

        {/* Checkbox */}
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? "bg-primary border-primary" : "border-border"
        }`}>
          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
        </div>
      </div>
    );
  };

  // Detail view
  if (detailExercise) {
    const ex = detailExercise;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0" dir="rtl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button onClick={() => setDetailExercise(null)} className="text-sm text-primary font-medium">رجوع</button>
            <DialogTitle className="text-sm">{ex.name_ar ?? getArabicName(ex.name)}</DialogTitle>
            <div className="w-8" />
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-muted aspect-square max-w-[300px] mx-auto flex items-center justify-center">
                {ex.gifUrl ? (
                  <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-contain" />
                ) : (
                  <Dumbbell className="w-20 h-20 text-muted-foreground/40" strokeWidth={1.25} />
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{ex.name_ar ?? getArabicName(ex.name)}</p>
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
              <Button className="w-full" onClick={() => {
                toggleSelect(ex);
                setDetailExercise(null);
              }}>
                إضافة للتمرين
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0" dir="rtl">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" strokeWidth={1.5} />
              البحث عن تمرين
            </DialogTitle>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="search" className="text-xs gap-1">
                <Search className="w-3 h-3" />بحث
              </TabsTrigger>
              <TabsTrigger value="bodypart" className="text-xs gap-1">
                <Dumbbell className="w-3 h-3" />عضلة
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs gap-1">
                <Clock className="w-3 h-3" />الأخيرة
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Search Tab */}
          {tab === "search" && (
            <>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث بالعربي أو الإنجليزي... (مثال: chest, بنش)"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pr-10 h-10"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {exercises.length} نتيجة {loading && "..."}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1" onScroll={handleScroll}>
                {exercises.map(renderExerciseRow)}
                {loading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                {!loading && exercises.length === 0 && debouncedSearch.length >= 1 && (
                  <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
                )}
              </div>
            </>
          )}

          {/* Body Part Tab */}
          {tab === "bodypart" && !selectedBodyPart && (
            <div className="p-3 grid grid-cols-2 gap-2">
              {BODY_PARTS.map(bp => {
                const config = BODY_PART_CONFIG[bp] || { color: "bg-muted text-muted-foreground" };
                return (
                  <button
                    key={bp}
                    onClick={() => setSelectedBodyPart(bp)}
                    className={`p-4 rounded-xl border border-border hover:border-primary/30 transition-all text-center ${config.color}`}
                  >
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

          {/* Recent Tab */}
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
          <div className="p-3 border-t border-border bg-card">
            <Button className="w-full gap-2" onClick={handleAdd}>
              <Check className="w-4 h-4" />
              إضافة {selectedIds.size} تمرين
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseDBSearch;
