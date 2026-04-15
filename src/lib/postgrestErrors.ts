/**
 * PostgREST / Postgres "undefined column" (e.g. remote DB behind repo migrations).
 */
export function isUndefinedColumnError(error: unknown, columnName?: string): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const code = String(e.code ?? "");
  const msg = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  if (code !== "42703" && !msg.includes("does not exist")) return false;
  if (!columnName) return true;
  const col = columnName.toLowerCase();
  return msg.includes(col) || msg.includes(col.replace(/_/g, " "));
}
