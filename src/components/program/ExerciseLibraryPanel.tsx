import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Check, Dumbbell, Clock, Loader2, X,
} from "lucide-react";
import {
  ExerciseDBItem, getArabicName, getArabicBodyPart, getArabicTarget,
  getArabicEquipment, BODY_PART_CONFIG,
} from "@/lib/exercise-translations";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";
import { mergeExerciseListsPreferLocal } from "@/lib/localExercisesDb";
import { useToast } from "@/hooks/use-toast";
import {
  ensureExerciseLibrarySynced,
  searchExercisesUnified,
  fetchRemoteExercisePage,
  retryExerciseLibrarySync,
} from "@/lib/exercise-library-service";
import {
  MUSCLE_FILTER_OPTIONS,
  EQUIPMENT_FILTER_OPTIONS,
} from "@/lib/exercise-filter-maps";
import { ExerciseGifImage } from "@/components/program/ExerciseGifImage";

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

function ResultGridSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 rounded-lg border border-border/40">
          <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[70%] mr-auto" />
            <Skeleton className="h-3 w-[45%] mr-auto" />
            <Skeleton className="h-5 w-24 mr-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const { toast } = useToast();
  const listSource = useRef<"db" | "local" | "remote">("remote");

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("recent-exercises");
      if (stored) {
        try { setRecentExercises(JSON.parse(stored)); } catch { /* */ }
      }
      setSelectedIds(new Set());
      setSearch("");
      setSelectedBodyPart(null);
      setDetailExercise(null);
      setMuscleFilter(null);
      setEquipmentFilter(null);
      void ensureExerciseLibrarySynced();
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const bp =
        tab === "bodypart" && selectedBodyPart
          ? selectedBodyPart
          : muscleFilter;
      const res = await searchExercisesUnified({
        query: tab === "search" ? debouncedSearch : undefined,
        bodyPart: bp,
        equipmentMatch: equipmentFilter,
        offset: 0,
        limit: 80,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      listSource.current = res?.source ?? "local";
      setExercises(items);
      setOffset(items.length);
      setHasMore(res?.source !== "db" && items.length >= 25);
    } catch {
      setExercises([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [open, tab, selectedBodyPart, muscleFilter, equipmentFilter, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    if (tab === "search" || (tab === "bodypart" && selectedBodyPart)) {
      setOffset(0);
      void loadPage();
    }
  }, [debouncedSearch, open, tab, selectedBodyPart, muscleFilter, equipmentFilter, loadPage]);

  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - 100 || !hasMore || loading) return;
      if (listSource.current === "db") return;

      const bp =
        tab === "bodypart" && selectedBodyPart
          ? selectedBodyPart
          : muscleFilter;

      setLoading(true);
      try {
        const remote = await fetchRemoteExercisePage(
          tab === "search" ? debouncedSearch : undefined,
          bp ?? undefined,
          offset,
        );
        const safeRemote = Array.isArray(remote) ? remote : [];
        let next = safeRemote;
        if (equipmentFilter) {
          next = safeRemote.filter((ex) =>
            ex && (ex.equipment || "").toLowerCase().includes(equipmentFilter.toLowerCase()),
          );
        }
        setExercises((prev) => mergeExerciseListsPreferLocal(prev ?? [], next));
        setHasMore(safeRemote.length >= 30);
        setOffset((o) => o + safeRemote.length);
      } catch {
        /* keep current list */
      } finally {
        setLoading(false);
      }
    },
    [hasMore, loading, offset, tab, debouncedSearch, selectedBodyPart, muscleFilter, equipmentFilter],
  );

  const toggleSelect = (ex: ExerciseDBItem) => {
    const id = typeof ex?.id === "string" ? ex.id : "";
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const allExercises = [...(exercises ?? []), ...(recentExercises ?? [])];
    const selected = allExercises.filter((e) => e && typeof e.id === "string" && selectedIds.has(e.id));
    const unique = selected.filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);

    const mapped: SelectedExercise[] = unique.map((e) => ({
      id: e.id,
      name_en: e.name ?? "",
      name_ar: e.name_ar ?? getArabicName(e.name ?? ""),
      bodyPart: e.bodyPart ?? "",
      target: e.target ?? "",
      equipment: e.equipment ?? "",
      gifUrl: e.gifUrl || getExerciseImageUrl(e.id),
      secondaryMuscles: Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : [],
      instructions: Array.isArray(e.instructions) ? e.instructions : [],
    }));

    const recent = [...unique, ...recentExercises]
      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
      .slice(0, 20);
    localStorage.setItem("recent-exercises", JSON.stringify(recent));

    onAdd(mapped);
    setSelectedIds(new Set());
    onClose();
  };

  const renderExerciseRow = (ex: ExerciseDBItem | null | undefined) => {
    if (!ex || typeof ex.id !== "string" || !ex.id) return null;
    const nameEn = ex.name ?? "";
    const bodyPartKey = ex.bodyPart ?? "";
    const isSelected = selectedIds.has(ex.id);
    const arName = (ex.name_ar ?? "").trim() || getArabicName(nameEn);
    const config = BODY_PART_CONFIG[bodyPartKey] || { color: "bg-muted text-muted-foreground" };
    const isBundledLocal = ex.id.startsWith("fitni-db-");
    const thumb =
      (ex.gifUrl && String(ex.gifUrl)) || (!isBundledLocal ? getExerciseImageUrl(ex.id) : "");

    return (
      <div
        key={ex.id}
        className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${
          isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
        }`}
        onClick={() => toggleSelect(ex)}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative flex items-center justify-center border border-border/30">
          {thumb ? (
            <ExerciseGifImage
              src={thumb}
              alt={nameEn || arName}
              className="h-full w-full"
              objectFit="cover"
              loading="lazy"
              errorFallback={
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-primary/15 text-lg font-bold text-primary-foreground">
                  {isBundledLocal ? (
                    <Dumbbell className="w-7 h-7 text-muted-foreground/50" strokeWidth={1.5} />
                  ) : (
                    (nameEn || "?").charAt(0).toUpperCase()
                  )}
                </div>
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-primary/15 text-lg font-bold text-primary-foreground">
              {isBundledLocal ? (
                <Dumbbell className="w-7 h-7 text-muted-foreground/50" strokeWidth={1.5} />
              ) : (
                (nameEn || "?").charAt(0).toUpperCase()
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold text-foreground truncate">{arName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{nameEn}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-end">
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${config.color}`}>
              {getArabicBodyPart(bodyPartKey)}
            </Badge>
            <span className="text-[9px] text-muted-foreground">{getArabicEquipment(ex.equipment ?? "")}</span>
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isSelected ? "bg-primary border-primary" : "border-border"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
        </div>
      </div>
    );
  };

  if (!open) return null;

  if (detailExercise) {
    const ex = detailExercise;
    const detailNameEn = ex.name ?? "";
    const detailTitle = (ex.name_ar ?? "").trim() || getArabicName(detailNameEn);
    const detailGif =
      ex.id.startsWith("fitni-db-")
        ? ""
        : ((ex.gifUrl && String(ex.gifUrl).trim()) || getExerciseImageUrl(ex.id));
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card border-r border-border" dir="rtl">
        <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => setDetailExercise(null)} className="text-sm text-primary font-medium">
            رجوع
          </button>
          <span className="text-sm font-bold">{detailTitle}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ScrollArea className="min-h-0 flex-1 p-4">
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-muted aspect-square max-w-[280px] min-h-[200px] mx-auto relative flex items-center justify-center border border-border/50">
              {ex.id.startsWith("fitni-db-") ? (
                <Dumbbell className="w-20 h-20 text-muted-foreground/40" strokeWidth={1.25} />
              ) : detailGif ? (
                <ExerciseGifImage
                  src={detailGif}
                  alt={detailNameEn || detailTitle}
                  className="h-full max-h-[280px] w-full"
                  objectFit="contain"
                  loading="eager"
                  errorFallback={
                    <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-primary/20 text-5xl font-bold text-primary-foreground">
                      {(detailNameEn || "?").charAt(0).toUpperCase()}
                    </div>
                  }
                />
              ) : (
                <Dumbbell className="w-20 h-20 text-muted-foreground/40" strokeWidth={1.25} />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{detailTitle}</p>
              <p className="text-sm text-muted-foreground">{detailNameEn}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className={BODY_PART_CONFIG[ex.bodyPart ?? ""]?.color || ""}>{getArabicBodyPart(ex.bodyPart ?? "")}</Badge>
              <Badge variant="secondary">{getArabicTarget(ex.target ?? "")}</Badge>
              <Badge variant="outline">{getArabicEquipment(ex.equipment ?? "")}</Badge>
            </div>
            {Array.isArray(ex.secondaryMuscles) && ex.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">العضلات المساعدة</p>
                <div className="flex gap-1 flex-wrap">
                  {ex.secondaryMuscles.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px]">
                      {getArabicTarget(m)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(ex.instructions) && ex.instructions.length > 0 && (
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
            <Button
              className="w-full"
              onClick={() => {
                toggleSelect(ex);
                setDetailExercise(null);
              }}
            >
              إضافة للتمرين
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card border-r border-border" dir="rtl">
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" strokeWidth={1.5} />
            مكتبة التمارين
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(
            [
              { key: "search", label: "بحث", icon: Search },
              { key: "bodypart", label: "عضلة", icon: Dumbbell },
              { key: "recent", label: "الأخيرة", icon: Clock },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSelectedBodyPart(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "search" && (
          <>
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالعربي أو الإنجليزي — مثل سحب علوي، chest..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 h-9"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] text-muted-foreground w-full">المجموعة العضلية</span>
                {MUSCLE_FILTER_OPTIONS.map((m) => (
                  <button
                    key={m.bodyPart}
                    type="button"
                    onClick={() => setMuscleFilter(muscleFilter === m.bodyPart ? null : m.bodyPart)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      muscleFilter === m.bodyPart
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] text-muted-foreground w-full">المعدات</span>
                {EQUIPMENT_FILTER_OPTIONS.map((m) => (
                  <button
                    key={m.match}
                    type="button"
                    onClick={() => setEquipmentFilter(equipmentFilter === m.match ? null : m.match)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      equipmentFilter === m.match
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{(exercises ?? []).length} نتيجة</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" onScroll={handleScroll}>
              {loading && (exercises ?? []).length === 0 ? (
                <ResultGridSkeleton />
              ) : (
                <div className="p-2 space-y-1">
                  {(exercises ?? []).map(renderExerciseRow)}
                  {loading && (exercises ?? []).length > 0 && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                  {!loading && (exercises ?? []).length === 0
                    && (debouncedSearch.length >= 1 || muscleFilter || equipmentFilter) && (
                    <div className="flex flex-col items-center gap-3 py-8 px-2">
                      <p className="text-center text-sm text-muted-foreground">لا توجد نتائج</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={syncRetrying}
                        onClick={async () => {
                          setSyncRetrying(true);
                          try {
                            const r = await retryExerciseLibrarySync();
                            if (r.ok) {
                              toast({
                                title: "تمت مزامنة المكتبة",
                                description:
                                  r.count != null ? `تم تحديث ${r.count} تمرين` : undefined,
                              });
                              await loadPage();
                            } else {
                              toast({
                                title: "تعذّرت المزامنة",
                                description: r.error,
                                variant: "destructive",
                              });
                            }
                          } finally {
                            setSyncRetrying(false);
                          }
                        }}
                      >
                        {syncRetrying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        إعادة مزامنة المكتبة
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground max-w-[240px]">
                        إن كانت قاعدة البيانات فارغة، تُعبأ من ExerciseDB عبر المزامنة
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "bodypart" && !selectedBodyPart && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {BODY_PARTS.map((bp) => {
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
              <button
                onClick={() => {
                  setSelectedBodyPart(null);
                  setExercises([]);
                }}
                className="text-xs text-primary font-medium"
              >
                رجوع
              </button>
              <p className="text-sm font-bold">{getArabicBodyPart(selectedBodyPart)}</p>
              <p className="text-[10px] text-muted-foreground">{(exercises ?? []).length} تمرين</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 [-webkit-overflow-scrolling:touch]" onScroll={handleScroll}>
              {loading && (exercises ?? []).length === 0 ? (
                <ResultGridSkeleton />
              ) : (
                <>
                  {(exercises ?? []).map(renderExerciseRow)}
                  {loading && (exercises ?? []).length > 0 && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {tab === "recent" && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 [-webkit-overflow-scrolling:touch]">
            {recentExercises.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد تمارين حديثة</p>
              </div>
            ) : (
              (recentExercises ?? []).map(renderExerciseRow)
            )}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 p-3 border-t border-border">
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
