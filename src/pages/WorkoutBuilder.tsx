import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Dumbbell,
  FileDown,
  LayoutTemplate,
  Loader2,
  Plus,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { WorkoutCanvas } from "@/components/workout-builder/WorkoutCanvas";
import { WorkoutBuilderValidationBadge } from "@/components/workout-builder/WorkoutBuilderValidationBadge";
import { TemplatesGalleryModal } from "@/components/workout-builder/TemplatesGalleryModal";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import usePageTitle from "@/hooks/usePageTitle";
import {
  buildWorkoutRefactorPrompt,
  extractJsonObjectFromLlmResponse,
} from "@/lib/ai-prompt-builder";
import { refactorProgramWithAI } from "@/lib/ai-service";
import { exportWorkoutProgramPdf } from "@/lib/workout-export-pdf";
import { validateWorkoutProgram } from "@/lib/validations/workout";
import { useTemplateStore } from "@/stores/templateStore";
import type { WorkoutProgram } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AI_STREAMING_MESSAGES } from "@/constants/workout-builder-ai-messages";
import {
  useSafeWorkoutBuilderStore,
  useWorkoutBuilderStore,
  validateWorkoutBuilderStoreState,
  WORKOUT_BUILDER_STORAGE_KEY,
} from "@/stores/workoutBuilderStore";

type CopilotStep = "compose" | "preview";

type WorkoutBuilderErrorBoundaryState = { hasError: boolean; error: Error | null };

/**
 * Catches render errors in the builder subtree so the global Sentry boundary does not blank the whole app.
 * "Reset Builder" restores the Zustand slice to defaults.
 */
class WorkoutBuilderErrorBoundary extends Component<
  { children: ReactNode },
  WorkoutBuilderErrorBoundaryState
> {
  state: WorkoutBuilderErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): WorkoutBuilderErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[WorkoutBuilder] render error", error, info.componentStack);
  }

  handleResetBuilder = () => {
    useWorkoutBuilderStore.getState().resetBuilderState();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          dir="rtl"
        >
          <p className="max-w-md text-sm font-medium text-foreground">
            حدث خطأ أثناء عرض منشئ التمارين. يمكنك إعادة تعيين المحرّر إلى الحالة الافتراضية دون إعادة تحميل الصفحة
            بالكامل.
          </p>
          {this.state.error ? (
            <p className="max-w-lg break-all font-mono text-[11px] text-muted-foreground" dir="ltr">
              {this.state.error.message}
            </p>
          ) : null}
          <Button type="button" onClick={this.handleResetBuilder}>
            إعادة تعيين المحرّر
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function buildAiComparisonLines(before: WorkoutProgram, after: WorkoutProgram): string[] {
  const lines: string[] = [];

  const exerciseCount = (p: WorkoutProgram) =>
    p.days.reduce((n, d) => n + d.exercises.length, 0);
  const setCount = (p: WorkoutProgram) =>
    p.days.reduce((s, d) => s + d.exercises.reduce((a, e) => a + e.sets.length, 0), 0);

  const bEx = exerciseCount(before);
  const aEx = exerciseCount(after);
  if (bEx !== aEx) {
    const delta = aEx - bEx;
    const verb = delta > 0 ? "إضافة" : "إزالة";
    lines.push(
      `اقتراح الذكاء الاصطناعي: ${verb} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "تمرين" : "تمارين"} (قبل: ${bEx} ← بعد: ${aEx}).`,
    );
  }

  const bSets = setCount(before);
  const aSets = setCount(after);
  if (bSets !== aSets) {
    lines.push(`إجمالي المجموعات: ${bSets} ← ${aSets}`);
  }

  const avgSquatRest = (p: WorkoutProgram): number | null => {
    const rests: number[] = [];
    for (const d of p.days) {
      for (const e of d.exercises) {
        if (/squat|سكوات/i.test(e.exercise.name)) {
          for (const s of e.sets) {
            if (s.restTime != null) rests.push(s.restTime);
          }
        }
      }
    }
    if (!rests.length) return null;
    return Math.round(rests.reduce((x, y) => x + y, 0) / rests.length);
  };
  const br = avgSquatRest(before);
  const ar = avgSquatRest(after);
  if (br != null && ar != null && br !== ar) {
    lines.push(`متوسط راحة تمارين السكوات: ${br}ث ← ${ar}ث`);
  } else if (ar != null && br === null) {
    lines.push(`تم ضبط أوقات الراحة لتمارين السكوات (متوسط ${ar}ث)`);
  }

  if (before.title !== after.title) lines.push(`العنوان: «${before.title}» ← «${after.title}»`);
  if (before.days.length !== after.days.length) {
    lines.push(`عدد الأيام: ${before.days.length} ← ${after.days.length}`);
  }

  if (lines.length === 0) {
    lines.push("لا تغييرات جوهرية في العنوان/الأيام/التمارين/المجموعات حسب الملخص التلقائي.");
  }

  return lines;
}

/**
 * Shell only: persist hydration + emergency error listener. No trainer shell / no week data until hydrated.
 */
export default function WorkoutBuilder() {
  usePageTitle("منشئ التمارين");
  const hasHydrated = useWorkoutBuilderStore((s) => s._hasHydrated);

  useEffect(() => {
    const store = useWorkoutBuilderStore;
    const afterHydration = () => {
      try {
        validateWorkoutBuilderStoreState(store.getState());
        store.setState({ _hasHydrated: true });
      } catch (e) {
        console.error("[WorkoutBuilder] Persisted state invalid", e);
        try {
          store.persist.clearStorage();
        } catch {
          /* ignore */
        }
        try {
          localStorage.removeItem(WORKOUT_BUILDER_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        store.getState().resetBuilderState();
      }
    };

    if (store.persist.hasHydrated()) {
      afterHydration();
    }
    return store.persist.onFinishHydration(afterHydration);
  }, []);

  useEffect(() => {
    const handleError = (e: Event) => {
      const msg = e instanceof ErrorEvent ? e.message : "";
      if (msg.includes("hydration") || msg.includes("persist")) {
        console.warn("Detected store corruption, emergency reset...");
        try {
          useWorkoutBuilderStore.persist.clearStorage();
        } catch {
          /* ignore */
        }
        window.location.reload();
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (!hasHydrated) {
    return (
      <div className="flex h-[min(100dvh,720px)] items-center justify-center gap-3" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">جارٍ تحميل المحرّر…</p>
      </div>
    );
  }

  return <WorkoutBuilderInner />;
}

function WorkoutBuilderInner() {
  const trainerShellOpts = useMemo(() => ({ title: "منشئ التمارين" as const }), []);
  useRegisterTrainerShell(trainerShellOpts);

  const title = useSafeWorkoutBuilderStore((s) => s.title);
  const setTitle = useSafeWorkoutBuilderStore((s) => s.setTitle);
  const weeksCount = useSafeWorkoutBuilderStore((s) => s.weeksCount);
  const activeWeekIndex = useSafeWorkoutBuilderStore((s) => s.activeWeekIndex);
  const setActiveWeekIndex = useSafeWorkoutBuilderStore((s) => s.setActiveWeekIndex);
  const addWeek = useSafeWorkoutBuilderStore((s) => s.addWeek);
  const getProgramSnapshot = useSafeWorkoutBuilderStore((s) => s.getProgramSnapshot);
  const replaceActiveWeekFromProgram = useSafeWorkoutBuilderStore((s) => s.replaceActiveWeekFromProgram);

  const programSnapshot =
    useSafeWorkoutBuilderStore((s) => {
      try {
        const days = Array.isArray(s.weekDays) ? (s.weekDays[s.activeWeekIndex] ?? []) : [];
        return {
          id: s.programId,
          title: s.title,
          description: s.description,
          weeksCount: s.weeksCount,
          days,
        };
      } catch {
        return {
          id: "",
          title: "",
          description: "",
          weeksCount: 1,
          days: [],
        };
      }
    }) ?? { id: "", title: "", description: "", weeksCount: 1, days: [] };

  const addTemplate = useTemplateStore((s) => s.addTemplate);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotStep, setCopilotStep] = useState<CopilotStep>("compose");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [builtPrompt, setBuiltPrompt] = useState("");
  const [pendingProgram, setPendingProgram] = useState<WorkoutProgram | null>(null);
  const [pasteJson, setPasteJson] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusIdx, setAiStatusIdx] = useState(0);

  const weekLabels = useMemo(() => {
    try {
      const n = Math.max(1, Math.min(52, Math.floor(Number(weeksCount ?? 1)) || 1));
      return Array.from({ length: n }, (_, i) => i);
    } catch {
      return [0];
    }
  }, [weeksCount]);

  useEffect(() => {
    if (!aiLoading) {
      setAiStatusIdx(0);
      return;
    }
    if (!AI_STREAMING_MESSAGES || AI_STREAMING_MESSAGES.length === 0) {
      return;
    }
    const len = AI_STREAMING_MESSAGES.length;
    const id = window.setInterval(() => {
      setAiStatusIdx((i) => (i + 1) % len);
    }, 1600);
    return () => window.clearInterval(id);
  }, [aiLoading]);

  const resetCopilot = useCallback(() => {
    setCopilotStep("compose");
    setCopilotPrompt("");
    setBuiltPrompt("");
    setPendingProgram(null);
    setPasteJson("");
    setAiLoading(false);
  }, []);

  const saveAsTemplate = useCallback(() => {
    if (!getProgramSnapshot) return;
    const snap = getProgramSnapshot();
    const v = validateWorkoutProgram(snap);
    if (!v.ok) {
      toast.error("لا يمكن حفظ قالب بهيكل غير صالح");
      return;
    }
    addTemplate((title ?? "").trim() || "قالب بدون اسم", snap);
    toast.success("تم حفظ القالب", { description: "يمكنك فتح المعرض من «قوالبي»." });
  }, [addTemplate, getProgramSnapshot, title]);

  const exportPdf = useCallback(() => {
    if (!getProgramSnapshot) return;
    const snap = getProgramSnapshot();
    exportWorkoutProgramPdf(snap, (title ?? "").replace(/\s+/g, "_").slice(0, 60) || "workout");
    toast.message("تصدير PDF", { description: "تم تنزيل الملف." });
  }, [getProgramSnapshot, title]);

  const runAiRequest = useCallback(async () => {
    if (!getProgramSnapshot) return;
    const trimmed = copilotPrompt.trim();
    if (!trimmed) {
      toast.error("اكتب طلباً للمساعد");
      return;
    }
    const snap = getProgramSnapshot();
    const prompt = buildWorkoutRefactorPrompt(snap, trimmed);
    setBuiltPrompt(prompt);
    setAiLoading(true);

    try {
      const next = await refactorProgramWithAI(prompt);
      setPendingProgram(next);
      setCopilotStep("preview");
      toast.message("معاينة جاهزة", { description: "راجع المقارنة قبل/بعد ثم أكّد الاستبدال." });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل توليد البرنامج");
    } finally {
      setAiLoading(false);
    }
  }, [copilotPrompt, getProgramSnapshot]);

  const tryApplyPastedJson = useCallback(() => {
    try {
      const raw = extractJsonObjectFromLlmResponse(pasteJson) ?? pasteJson.trim();
      const json = JSON.parse(raw) as unknown;
      const v = validateWorkoutProgram(json);
      if (!v.ok || !v.program) {
        toast.error(v.zodError?.message ?? "JSON غير صالح");
        return;
      }
      setPendingProgram(v.program);
      toast.success("تم تحميل البرنامج من JSON");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذر تحليل JSON");
    }
  }, [pasteJson]);

  const confirmAiOverwrite = useCallback(() => {
    if (!pendingProgram || !replaceActiveWeekFromProgram) return;
    const res = replaceActiveWeekFromProgram(pendingProgram);
    if (!res.ok) {
      toast.error('message' in res ? res.message : "خطأ غير معروف");
      return;
    }
    toast.success("تم تحديث البرنامج");
    setCopilotOpen(false);
    resetCopilot();
  }, [pendingProgram, replaceActiveWeekFromProgram, resetCopilot]);

  const diffSummary = useMemo(() => {
    try {
      if (!pendingProgram) return [] as string[];
      return buildAiComparisonLines(programSnapshot, pendingProgram);
    } catch (e) {
      console.error("[WorkoutBuilder] diffSummary", e);
      return [] as string[];
    }
  }, [pendingProgram, programSnapshot]);

  if (
    title == null ||
    setTitle == null ||
    weeksCount == null ||
    activeWeekIndex == null ||
    setActiveWeekIndex == null ||
    addWeek == null ||
    getProgramSnapshot == null ||
    replaceActiveWeekFromProgram == null
  ) {
    return (
      <div className="flex h-48 items-center justify-center gap-2" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="text-sm text-muted-foreground">جارٍ التهيئة…</span>
      </div>
    );
  }

  let main: ReactNode;
  try {
    main = (
    <WorkoutBuilderErrorBoundary>
      <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">مسودة البرنامج</p>
            <WorkoutBuilderValidationBadge program={programSnapshot} />
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-auto border-0 bg-transparent px-0 text-2xl font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0 md:text-3xl"
            placeholder="عنوان البرنامج"
            aria-label="عنوان البرنامج"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
            onClick={() => {
              resetCopilot();
              setCopilotOpen(true);
            }}
          >
            <Wand2 className="h-4 w-4" strokeWidth={1.5} />
            توليد / إصلاح بالذكاء الاصطناعي
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={exportPdf}>
            <FileDown className="h-4 w-4" strokeWidth={1.5} />
            تصدير PDF
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={saveAsTemplate}>
            <LayoutTemplate className="h-4 w-4" strokeWidth={1.5} />
            حفظ كقالب
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setGalleryOpen(true)}>
            <BookOpen className="h-4 w-4" strokeWidth={1.5} />
            قوالبي
          </Button>
          <Button type="button" className="gap-2" onClick={addWeek}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            إضافة أسبوع
          </Button>
        </div>
      </header>

      <TemplatesGalleryModal open={galleryOpen} onOpenChange={setGalleryOpen} />

      <Sheet
        open={copilotOpen}
        onOpenChange={(o) => {
          setCopilotOpen(o);
          if (!o) resetCopilot();
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl" dir="rtl">
          {copilotStep === "compose" ? (
            <>
              <SheetHeader className="text-start">
                <SheetTitle>مساعد التمارين</SheetTitle>
                <SheetDescription>
                  يُنشأ طلب جاهز للـ LLM. بعد الربط بالخادم، الصق رد JSON هنا أو استخدم المعاينة التجريبية.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-1 flex-col gap-3">
                <Textarea
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  placeholder="مثال: حوّل هذا الأسبوع إلى دفع فقط، أو أضف يوم راحة بعد كل يوم سحب..."
                  className="min-h-[140px] resize-none"
                  dir="rtl"
                />
                <Button type="button" className="w-full gap-2" disabled={aiLoading} onClick={runAiRequest}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
                  توليد (Gemini)
                </Button>
                {aiLoading ? (
                  <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                    {AI_STREAMING_MESSAGES[aiStatusIdx]}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <SheetHeader className="text-start">
                <SheetTitle>معاينة التغييرات</SheetTitle>
                <SheetDescription>
                  راجع البرنامج المقترح قبل استبدال الأسبوع الحالي في المحرر.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <p className="mb-1 font-semibold text-foreground">قبل وبعد — هل تقبل التعديل؟</p>
                  <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                    {diffSummary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <details className="rounded-lg border border-border bg-card/50 text-xs">
                  <summary className="cursor-pointer px-3 py-2 font-medium">الطلب الكامل المرسل للـ AI</summary>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-3 pb-2 text-[10px] text-muted-foreground">
                    {builtPrompt.slice(0, 8000)}
                    {builtPrompt.length > 8000 ? "…" : ""}
                  </pre>
                </details>

                <div className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/20 p-2">
                  <pre className="text-[10px] leading-relaxed text-foreground">
                    {pendingProgram ? JSON.stringify(pendingProgram, null, 2) : ""}
                  </pre>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-foreground">لصق رد JSON حقيقي من الـ LLM (اختياري)</p>
                  <Textarea
                    value={pasteJson}
                    onChange={(e) => setPasteJson(e.target.value)}
                    placeholder='{"id":"...","title":"...", ...}'
                    className="min-h-[80px] font-mono text-[11px]"
                    dir="ltr"
                  />
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={tryApplyPastedJson}>
                    تحليل JSON وتحديث المعاينة
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setCopilotStep("compose")}>
                    رجوع
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setCopilotOpen(false);
                      resetCopilot();
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!pendingProgram}
                    onClick={confirmAiOverwrite}
                  >
                    تأكيد الاستبدال
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <section aria-label="تبديل الأسابيع">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <span>الأسابيع</span>
        </div>
        <div
          className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/60 p-2"
          role="tablist"
          dir="rtl"
        >
          {weekLabels.map((weekIdx) => {
            const selected = activeWeekIndex === weekIdx;
            return (
              <button
                key={weekIdx}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveWeekIndex(weekIdx)}
                className="relative rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              >
                {selected ? (
                  <motion.span
                    layoutId="workout-builder-week-pill"
                    className="absolute inset-0 rounded-xl bg-primary/15 shadow-sm ring-1 ring-primary/25"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                ) : null}
                <span className={`relative z-10 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                  أسبوع {weekIdx + 1}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          الأسبوع النشط: <span className="font-medium text-foreground">{activeWeekIndex + 1}</span> من {weeksCount} — اسحب
          التمارين بين الأيام أو أعد ترتيبها داخل اليوم.
        </p>
      </section>

      <section aria-label="لوحة التمارين" className="relative">
        {aiLoading ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/80 backdrop-blur-sm"
            aria-busy="true"
            aria-label="Gemini يعالج البرنامج"
          >
            <div className="max-w-md space-y-2 rounded-xl border border-border bg-card/95 px-4 py-3 text-center shadow-md">
              <p className="text-sm font-medium text-foreground">{AI_STREAMING_MESSAGES[aiStatusIdx]}</p>
              <p className="text-xs text-muted-foreground">CoachBase · Gemini</p>
            </div>
            <div className="w-full max-w-4xl space-y-3 px-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          </div>
        ) : null}
        <WorkoutCanvas />
      </section>
      </div>
    </WorkoutBuilderErrorBoundary>
    );
  } catch (err) {
    console.error("[WorkoutBuilder] render guard", err);
    main = (
      <div className="min-h-[40vh] rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center" dir="rtl">
        <p className="text-sm font-medium text-foreground">تعذّر تهيئة واجهة منشئ التمارين.</p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => useWorkoutBuilderStore.getState().resetBuilderState()}
        >
          إعادة تعيين المحرّر
        </Button>
      </div>
    );
  }

  return main;
}
