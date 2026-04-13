import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { z } from "zod";

import { hydrateWorkoutProgramIds } from "@/lib/workout-builder-utils";
import {
  collectWorkoutProgramIssues,
  formatWorkoutProgramIssuesArabic,
  formatWorkoutProgramZodError,
  validateWorkoutProgram,
  workoutProgramSchema,
} from "@/lib/validations/workout";
import type { WorkoutProgram } from "@/types/workout";

export type SavedWorkoutTemplate = {
  id: string;
  name: string;
  savedAt: string;
  program: WorkoutProgram;
};

type TemplateStoreState = {
  templates: SavedWorkoutTemplate[];
  addTemplate: (name: string, program: WorkoutProgram) => void;
  removeTemplate: (id: string) => void;
  /** Returns a fresh-id copy safe to load into the builder. */
  getHydratedProgram: (id: string) => WorkoutProgram | null;
};

export const useTemplateStore = create(
  persist<TemplateStoreState>(
    (set, get) => ({
      templates: [],

      addTemplate: (name, program) => {
        try {
          const parsed = workoutProgramSchema.parse(program);
          const issues = collectWorkoutProgramIssues(parsed);
          if (issues.length > 0) {
            toast.error("لا يمكن حفظ القالب", {
              description: formatWorkoutProgramIssuesArabic(issues),
            });
            return;
          }
          set((s) => ({
            templates: [
              ...s.templates,
              {
                id: crypto.randomUUID(),
                name: name.trim() || "قالب بدون اسم",
                savedAt: new Date().toISOString(),
                program: JSON.parse(JSON.stringify(parsed)) as WorkoutProgram,
              },
            ],
          }));
        } catch (e) {
          if (e instanceof z.ZodError) {
            toast.error("لا يمكن حفظ القالب", {
              description: formatWorkoutProgramZodError(e),
            });
            return;
          }
          toast.error("لا يمكن حفظ القالب", {
            description: e instanceof Error ? e.message : "خطأ غير معروف",
          });
        }
      },

      removeTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      getHydratedProgram: (id) => {
        const t = get().templates.find((x) => x.id === id);
        if (!t) return null;
        const v = validateWorkoutProgram(t.program);
        if (!v.ok || !v.program) return null;
        return hydrateWorkoutProgramIds(v.program);
      },
    }),
    {
      name: "fitni-workout-templates-v1",
      partialize: (s) => ({ templates: s.templates }),
    },
  ),
);
