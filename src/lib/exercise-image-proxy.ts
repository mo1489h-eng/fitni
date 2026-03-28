/**
 * Returns a proxied image URL for an exercise by its ExerciseDB ID.
 * Routes through our edge function to bypass CORS.
 */
export function getExerciseImageUrl(exerciseId: string): string {
  if (!exerciseId) return '';
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/exercisedb-proxy?endpoint=image&exerciseId=${encodeURIComponent(exerciseId)}`;
}
