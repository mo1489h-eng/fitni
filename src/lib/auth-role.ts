/** Canonical Fitni roles (must match DB `profiles.role` CHECK). */
export type FitniRole = "coach" | "trainee";

export function normalizeFitniRole(raw: string | null | undefined): FitniRole | null {
  if (!raw) return null;
  const r = raw.toLowerCase().trim();
  if (r === "coach" || r === "trainer") return "coach";
  if (r === "trainee" || r === "client") return "trainee";
  return null;
}
