/**
 * Run before `createClient` loads. Removes Supabase Auth keys from localStorage for any
 * project ref other than `VITE_SUPABASE_PROJECT_ID` (e.g. legacy Lovable instance).
 */
function clearMismatchedSupabaseStorage(): void {
  if (typeof localStorage === "undefined") return;
  const current = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (!current) return;

  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("sb-")) continue;
    const m = key.match(/^sb-([a-z0-9]+)-/i);
    const ref = m?.[1];
    if (ref && ref !== current) {
      localStorage.removeItem(key);
    }
  }
}

clearMismatchedSupabaseStorage();
