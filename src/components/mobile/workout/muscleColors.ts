/** Target muscle chips — Fitbod-style palette (Arabic + English) */
const PALETTE: Record<string, string> = {
  chest: "#3B82F6",
  صدر: "#3B82F6",
  back: "#8B5CF6",
  ظهر: "#8B5CF6",
  legs: "#F59E0B",
  أرجل: "#F59E0B",
  ساقين: "#F59E0B",
  shoulders: "#06B6D4",
  كتف: "#06B6D4",
  arms: "#EC4899",
  ذراع: "#EC4899",
  core: "#10B981",
  بطن: "#10B981",
  عام: "#64748B",
};

export function muscleChipColor(label: string): string {
  const k = label.trim().toLowerCase();
  for (const [key, hex] of Object.entries(PALETTE)) {
    if (k.includes(key.toLowerCase())) return hex;
  }
  return "#64748B";
}
