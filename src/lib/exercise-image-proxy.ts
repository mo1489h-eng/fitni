/**
 * Returns a proxied GIF URL for an ExerciseDB exercise id (string id from RapidAPI, e.g. "0025", not a UUID).
 * Uses `exercise-gif` Edge Function. Appends `apikey` so Supabase Kong accepts the request from `<img>` (no headers).
 * Shape: `{VITE_SUPABASE_URL}/functions/v1/exercise-gif?id=…&apikey=…`
 */
export function getExerciseImageUrl(exerciseId: string): string {
  if (!exerciseId) return "";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return "";
  const base = supabaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/functions/v1/exercise-gif`);
  url.searchParams.set("id", exerciseId);
  const anon =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anon) {
    url.searchParams.set("apikey", anon);
  }
  return url.toString();
}

/** True when id looks like an ExerciseDB remote id (not bundled `fitni-db-*`, not a UUID). */
export function isLikelyExerciseDbRemoteId(id: string): boolean {
  const s = String(id).trim();
  if (!s || s.startsWith("fitni-db-")) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return false;
  }
  return true;
}
