/**
 * UUID v4 for client-side IDs. Falls back when `crypto.randomUUID` is missing
 * (some WebViews, older browsers, or non-secure HTTP) so routes like WorkoutBuilder don't crash on load.
 */
export function randomUUID(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
