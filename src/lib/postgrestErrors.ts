/**
 * PostgREST / Postgres "unknown column" (e.g. remote DB behind repo migrations).
 *
 * PostgREST uses PGRST204 + "Could not find ... in the schema cache" (not Postgres 42703).
 */

function getErrorText(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string };
    return `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`;
  }
  return String(error);
}

/** True when Postgres or PostgREST reports a missing/unknown column. */
export function isMissingColumnError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const e = error as { code?: string };
  const code = String(e.code ?? "");
  const msg = getErrorText(error).toLowerCase();
  if (code === "42703" || code === "PGRST204") return true;
  if (msg.includes("does not exist")) return true;
  if (msg.includes("could not find") && msg.includes("schema cache")) return true;
  return false;
}

export function errorMentionsColumn(error: unknown, ...columnNames: string[]): boolean {
  const msg = getErrorText(error).toLowerCase();
  return columnNames.some((n) => {
    const c = n.toLowerCase();
    return msg.includes(c) || msg.includes(c.replace(/_/g, " "));
  });
}

/**
 * True when the error is about a missing column, and the message matches the given name(s).
 * For `training_type`, also matches `trainer_type` in the message (common confusion / wording).
 */
export function isUndefinedColumnError(error: unknown, columnName?: string): boolean {
  if (!isMissingColumnError(error)) return false;
  if (!columnName) return true;
  const col = columnName.toLowerCase();
  const names =
    col === "training_type" || col === "trainer_type"
      ? ["training_type", "trainer_type"]
      : [col];
  return errorMentionsColumn(error, ...names);
}
