/** Coach (trainer) app lives under /coach — single canonical prefix. */
export const COACH_PREFIX = "/coach";
export const COACH_DASHBOARD = "/coach/dashboard";

/** Trainee app home (web). */
export const TRAINEE_HOME = "/trainee/home";

/**
 * Legacy names — point to canonical URLs so imports stay backward compatible.
 * Prefer COACH_DASHBOARD / TRAINEE_HOME in new code.
 */
export const TRAINER_HOME = COACH_DASHBOARD;
export const CLIENT_HOME = TRAINEE_HOME;
