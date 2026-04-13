/**
 * Returns a proxied image URL for an exercise by its ExerciseDB `external_id`.
 * Uses the `exercise-gif` Edge Function (same RapidAPI image path as `exercisedb-proxy` `endpoint=image`).
 */
export function getExerciseImageUrl(exerciseId: string): string {
  if (!exerciseId) return "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return "";
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/exercise-gif?id=${encodeURIComponent(exerciseId)}`;
}
