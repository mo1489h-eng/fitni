/**
 * Structured auth logs — DEV only (no PII in production builds).
 */
export function authLogDev(event: string, payload: Record<string, unknown> = {}): void {
  if (!import.meta.env.DEV) return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: "auth",
      event,
      ...payload,
    }),
  );
}
