import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getExerciseImageUrl } from "@/lib/exercise-image-proxy";

/**
 * Resolves a demo GIF for a program exercise by best-effort name match against `exercisedb_cache`.
 * Falls back to empty string (caller shows icon).
 */
export function useExerciseGifUrl(exerciseName: string | undefined, enabled = true) {
  const q = (exerciseName ?? "").trim();

  return useQuery({
    queryKey: ["exercise-gif-resolve", q],
    enabled: enabled && q.length > 1,
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("exercisedb_cache")
        .select("id")
        .ilike("name", `%${q}%`)
        .limit(1)
        .maybeSingle();
      if (error || !data?.id) return "";
      return getExerciseImageUrl(data.id);
    },
  });
}
