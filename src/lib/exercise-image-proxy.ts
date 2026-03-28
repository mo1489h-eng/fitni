/**
 * Returns a proxied image URL for an exercise by its ExerciseDB ID.
 * Routes through our edge function to bypass CORS.
 */
export function getExerciseImageUrl(exerciseId: string): string {
  if (!exerciseId) return '';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/exercise-gif?id=${encodeURIComponent(exerciseId)}`;
}
