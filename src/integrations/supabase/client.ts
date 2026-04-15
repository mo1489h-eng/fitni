import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    "[CoachBase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in .env — auth will fail.",
  );
}

if (import.meta.env.DEV && supabaseUrl && supabaseAnonKey) {
  let refFromJwt: string | undefined;
  try {
    const part = supabaseAnonKey.split(".")[1];
    if (part) refFromJwt = JSON.parse(atob(part)).ref as string | undefined;
  } catch {
    /* ignore */
  }
  console.info("[CoachBase] Supabase client", {
    url: supabaseUrl,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "(unset)",
    refInAnonKey: refFromJwt ?? "(could not parse)",
  });
  if (
    refFromJwt &&
    import.meta.env.VITE_SUPABASE_PROJECT_ID &&
    refFromJwt !== import.meta.env.VITE_SUPABASE_PROJECT_ID
  ) {
    console.warn("[CoachBase] Anon key `ref` does not match VITE_SUPABASE_PROJECT_ID — check .env and restart dev server.");
  }
}

export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
