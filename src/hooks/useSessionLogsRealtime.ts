import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SessionLogRow } from "@/lib/sessionLogs";
import { sessionLogSyncTs } from "@/lib/sessionLogs";

const DEFAULT_DEBOUNCE_MS = 80;

function logKey(row: Pick<SessionLogRow, "exercise_id" | "set_number">): string {
  return `${row.exercise_id}:${row.set_number}`;
}

function rowSyncMs(row: SessionLogRow): number {
  return new Date(sessionLogSyncTs(row)).getTime();
}

/**
 * Subscribes to `session_logs` for one workout session. Debounces bursts and dedupes by (exercise, set),
 * keeping the row with the latest `updated_at` (last write wins within the debounce window).
 * Invokes `onRows` only with rows whose `updated_by` is not the current user (no self-echo).
 */
export function useSessionLogsRealtime(
  sessionId: string | null,
  onRows: (rows: SessionLogRow[]) => void,
  options?: { debounceMs?: number; enabled?: boolean },
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const enabled = options?.enabled ?? true;
  const pending = useRef<Map<string, SessionLogRow>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      userIdRef.current = data.session?.user?.id ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) return;

    const flush = () => {
      if (pending.current.size === 0) return;
      const rows = [...pending.current.values()];
      pending.current.clear();
      const uid = userIdRef.current;
      const remoteRows = rows.filter((r) => !(r.updated_by && uid && r.updated_by === uid));
      if (remoteRows.length === 0) return;
      onRowsRef.current(remoteRows);
    };

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        flush();
      }, debounceMs);
    };

    const mergeRow = (row: SessionLogRow) => {
      const k = logKey(row);
      const prev = pending.current.get(k);
      if (prev && rowSyncMs(prev) > rowSyncMs(row)) return;
      pending.current.set(k, row);
      schedule();
    };

    const channel = supabase
      .channel(`session-logs-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_logs",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as SessionLogRow;
          if (!row?.exercise_id) return;
          const uid = userIdRef.current;
          if (row.updated_by && uid && row.updated_by === uid) return;
          mergeRow(row);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [sessionId, enabled, debounceMs]);
}
