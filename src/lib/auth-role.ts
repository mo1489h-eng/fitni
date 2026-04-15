/** Canonical Fitni roles (must match DB `profiles.role` CHECK). */
export type FitniRole = "coach" | "trainee";

/**
 * Normalize DB / legacy strings to a Fitni role.
 * Handles whitespace, common aliases, and stray BOM/zero-width chars from imports.
 */
export function normalizeFitniRole(raw: string | null | undefined): FitniRole | null {
  if (raw == null) return null;
  const r = raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim();
  if (!r) return null;
  if (r === "coach" || r === "trainer" || r === "training_coach") return "coach";
  if (r === "trainee" || r === "client" || r === "student") return "trainee";
  return null;
}
