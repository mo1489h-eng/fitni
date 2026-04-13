/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: site origin for auth redirects (e.g. https://coachbase.health). Defaults used when unset. */
  readonly VITE_AUTH_SITE_ORIGIN?: string;
}