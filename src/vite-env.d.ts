/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Anon key (alias of publishable key in Supabase docs). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** Optional: site origin for auth redirects (e.g. https://coachbase.health). Defaults used when unset. */
  readonly VITE_AUTH_SITE_ORIGIN?: string;
}