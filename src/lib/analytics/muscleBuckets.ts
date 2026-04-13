/** Map DB muscle_group (AR/EN) to six balance buckets for radar charts. */
export const MUSCLE_BUCKETS_AR: Record<MuscleBucket, string> = {
  chest: "صدر",
  back: "ظهر",
  legs: "أرجل",
  shoulders: "أكتاف",
  arms: "ذراعين",
  core: "وسط",
};

export type MuscleBucket = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

export function mapMuscleToBucket(raw: string | null | undefined): MuscleBucket | "other" {
  if (!raw) return "other";
  const s = raw.toLowerCase().trim();
  if (
    s.includes("chest") ||
    s.includes("pectoral") ||
    s.includes("صدر") ||
    s.includes("بنش")
  )
    return "chest";
  if (
    s.includes("back") ||
    s.includes("lat") ||
    s.includes("ظهر") ||
    s.includes("سحب") ||
    s.includes("row") ||
    s.includes("pull")
  )
    return "back";
  if (
    s.includes("leg") ||
    s.includes("quad") ||
    s.includes("hamstring") ||
    s.includes("glute") ||
    s.includes("calf") ||
    s.includes("سمانة") ||
    s.includes("رجل") ||
    s.includes("أرجل") ||
    s.includes("فخذ")
  )
    return "legs";
  if (
    s.includes("shoulder") ||
    s.includes("deltoid") ||
    s.includes("كتف") ||
    s.includes("أكتاف")
  )
    return "shoulders";
  if (
    s.includes("bicep") ||
    s.includes("tricep") ||
    s.includes("forearm") ||
    s.includes("arm") ||
    s.includes("ذراع") ||
    s.includes("عضد")
  )
    return "arms";
  if (s.includes("core") || s.includes("abs") || s.includes("وسط") || s.includes("بطن")) return "core";
  return "other";
}

export function bucketsList(): MuscleBucket[] {
  return ["chest", "back", "legs", "shoulders", "arms", "core"];
}
