import { useEffect } from "react";
import { attachOnlineRetryFlush, flushSessionLogRetryQueue } from "@/lib/sessionLogRetryQueue";

/** Flush pending session_logs once on mount and when the browser goes online. */
export function useSessionLogRetryAutoFlush() {
  useEffect(() => {
    void flushSessionLogRetryQueue();
    return attachOnlineRetryFlush();
  }, []);
}
