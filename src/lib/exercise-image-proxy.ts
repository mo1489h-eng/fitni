/**
 * Returns a proxied GIF URL for an ExerciseDB exercise id.
 * Path: `{VITE_SUPABASE_URL}/functions/v1/exercise-gif?id=…` (Edge Function `exercise-gif`).
 */
export function getExerciseImageUrl(exerciseId: string): string {
  if (!exerciseId) return "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return "";
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/functions/v1/exercise-gif?id=${encodeURIComponent(exerciseId)}`;
}
