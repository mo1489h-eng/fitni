import type { UpsertSessionLogParams } from "@/lib/sessionLogs";

const STORAGE_KEY = "coachbase_session_log_retry_v1";

export type PendingSessionLog = UpsertSessionLogParams & {
  /** Deterministic id for dedupe: sessionId:exerciseId:setNumber */
  dedupeKey: string;
  queuedAt: string;
};

function dedupeKeyOf(p: UpsertSessionLogParams): string {
  return `${p.sessionId}:${p.exerciseId}:${p.setNumber}`;
}

function loadQueue(): PendingSessionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSessionLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items: PendingSessionLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

/** Merge by dedupe key — last enqueue wins (same unique keys as DB). */
export function enqueueSessionLogRetry(entry: UpsertSessionLogParams): void {
  const q = loadQueue();
  const dedupeKey = dedupeKeyOf(entry);
  const next = q.filter((x) => x.dedupeKey !== dedupeKey);
  next.push({
    ...entry,
    dedupeKey,
    queuedAt: new Date().toISOString(),
  });
  saveQueue(next);
}

export async function flushSessionLogRetryQueue(): Promise<number> {
  const { upsertSessionLogInternal } = await import("@/lib/sessionLogs");
  let q = loadQueue();
  if (q.length === 0) return 0;
  let flushed = 0;
  const remaining: PendingSessionLog[] = [];
  for (const item of q) {
    try {
      await upsertSessionLogInternal(item);
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }
  saveQueue(remaining);
  return flushed;
}

export function attachOnlineRetryFlush(): () => void {
  const onOnline = () => {
    void flushSessionLogRetryQueue();
  };
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
