import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SessionPresenceRole = "trainer" | "trainee";

export type SessionPresenceUser = { user_id: string; role: SessionPresenceRole };

/**
 * Supabase Realtime Presence for a workout session (trainer + trainee).
 */
export function useSessionPresence(sessionId: string | null, role: SessionPresenceRole, enabled = true) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<SessionPresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sessionId || !enabled || !user?.id) {
      setOnlineUsers([]);
      return;
    }

    const channel = supabase.channel(`presence:session:${sessionId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list: SessionPresenceUser[] = [];
        const seen = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const p of presences as { user_id?: string; role?: SessionPresenceRole }[]) {
            const uid = p?.user_id;
            const r = p?.role;
            if (uid && r && (r === "trainer" || r === "trainee")) {
              const key = `${uid}:${r}`;
              if (seen.has(key)) continue;
              seen.add(key);
              list.push({ user_id: uid, role: r });
            }
          }
        }
        setOnlineUsers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, role });
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setOnlineUsers([]);
    };
  }, [sessionId, enabled, user?.id, role]);

  const trainerOnline = useMemo(
    () => onlineUsers.some((u) => u.role === "trainer"),
    [onlineUsers],
  );
  const traineeOnline = useMemo(
    () => onlineUsers.some((u) => u.role === "trainee"),
    [onlineUsers],
  );

  return { onlineUsers, trainerOnline, traineeOnline };
}
