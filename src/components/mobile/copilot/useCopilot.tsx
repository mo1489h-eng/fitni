import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CopilotRole = "trainer" | "client";
export type CopilotContextKind = "post_workout" | "pre_workout" | "general" | "program_review";

export type CopilotChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type OpenOpts = {
  context?: CopilotContextKind;
  autoMessage?: string;
  clientId?: string | null;
};

type CopilotCtx = {
  role: CopilotRole;
  /** Trainer: optional scope; Client: own client id */
  scopedClientId: string | null;
  setScopedClientId: (id: string | null) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  openCopilot: (opts?: OpenOpts) => void;
  messages: CopilotChatMessage[];
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  sendMessage: (text: string, context?: CopilotContextKind) => Promise<void>;
  clearConversation: () => Promise<void>;
  isSending: boolean;
  streamingText: string;
  pendingSuggestion: boolean;
  setPendingSuggestion: (v: boolean) => void;
  offlineQueue: string[];
};

const Ctx = createContext<CopilotCtx | null>(null);

const FN = import.meta.env.VITE_SUPABASE_URL + "/functions/v1/ai-copilot";

type ProviderProps = {
  role: CopilotRole;
  /** For client app: their clients.id */
  clientId?: string | null;
  /** When false, client profile is still loading — skip conversation fetch */
  clientReady?: boolean;
  children: ReactNode;
};

export function CopilotProvider({ role, clientId: fixedClientId, clientReady = true, children }: ProviderProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scopedClientId, setScopedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const sseLineBuf = useRef("");

  const effectiveScopeClientId = role === "client" ? fixedClientId ?? null : scopedClientId;

  const loadKey = useMemo(
    () => ["copilot-conversation", role, effectiveScopeClientId ?? "all"],
    [role, effectiveScopeClientId]
  );

  const { data: loadedConv } = useQuery({
    queryKey: loadKey,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      let q = supabase
        .from("copilot_conversations")
        .select("id, messages")
        .eq("user_id", u.user.id)
        .eq("role", role);
      q = effectiveScopeClientId ? q.eq("client_id", effectiveScopeClientId) : q.is("client_id", null);
      const { data, error } = await q.maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: open && (role === "trainer" || (clientReady && !!fixedClientId)),
  });

  useEffect(() => {
    if (isSending) return;
    if (!loadedConv?.id) return;
    setConversationId(loadedConv.id);
    const raw = loadedConv.messages as { role: string; content: string }[] | null;
    if (!Array.isArray(raw)) return;
    const last = raw.slice(-10);
    setMessages(
      last.map((m, i) => ({
        id: `db-${i}-${m.role}`,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content ?? "",
      }))
    );
  }, [loadedConv?.id, loadedConv?.messages, isSending]);

  const persistClear = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    let q = supabase.from("copilot_conversations").delete().eq("user_id", u.user.id).eq("role", role);
    q = effectiveScopeClientId ? q.eq("client_id", effectiveScopeClientId) : q.is("client_id", null);
    await q;
    setMessages([]);
    setConversationId(null);
    queryClient.invalidateQueries({ queryKey: loadKey });
  }, [effectiveScopeClientId, loadKey, queryClient, role]);

  const sendMessage = useCallback(
    async (text: string, context: CopilotContextKind = "general") => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!navigator.onLine) {
        setOfflineQueue((q) => [...q, trimmed]);
        setPendingSuggestion(true);
        return;
      }

      const userMsg: CopilotChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((m) => [...m, userMsg]);
      setIsSending(true);
      setStreamingText("");

      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error("انتهت الجلسة — سجّل الدخول مجدداً");

        const res = await fetch(FN, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role,
            message: trimmed,
            clientId: effectiveScopeClientId ?? undefined,
            conversationId: conversationId ?? undefined,
            context,
          }),
        });

        const cid = res.headers.get("X-Copilot-Conversation-Id");
        if (cid) setConversationId(cid);

        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "تعذّر إرسال الرسالة");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("لا يوجد رد من الخادم");

        const dec = new TextDecoder();
        let acc = "";
        sseLineBuf.current = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseLineBuf.current += dec.decode(value, { stream: true });
          const parts = sseLineBuf.current.split("\n");
          sseLineBuf.current = parts.pop() ?? "";
          for (const line of parts) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const d = j.choices?.[0]?.delta?.content;
              if (d) {
                acc += d;
                setStreamingText(acc);
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (sseLineBuf.current.trim()) {
          for (const line of sseLineBuf.current.split("\n")) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const d = j.choices?.[0]?.delta?.content;
              if (d) {
                acc += d;
                setStreamingText(acc);
              }
            } catch {
              /* ignore */
            }
          }
        }

        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant", content: acc || "…" },
        ]);
        setStreamingText("");
        queryClient.invalidateQueries({ queryKey: loadKey });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "حدث خطأ";
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `عذراً، ${msg}. يمكنك المحاولة مرة أخرى.`,
          },
        ]);
        setStreamingText("");
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, effectiveScopeClientId, loadKey, queryClient, role]
  );

  useEffect(() => {
    if (!navigator.onLine || offlineQueue.length === 0 || isSending) return;
    const [first, ...rest] = offlineQueue;
    setOfflineQueue(rest);
    void sendMessage(first, "general");
  }, [offlineQueue, isSending, sendMessage]);

  const openCopilot = useCallback(
    (opts?: OpenOpts) => {
      if (opts?.clientId !== undefined) setScopedClientId(opts.clientId);
      setOpen(true);
      setPendingSuggestion(false);
      if (opts?.autoMessage?.trim()) {
        window.setTimeout(() => {
          void sendMessage(opts.autoMessage!, opts?.context ?? "post_workout");
        }, 400);
      }
    },
    [sendMessage]
  );

  const clearConversation = useCallback(async () => {
    await persistClear();
  }, [persistClear]);

  const value = useMemo<CopilotCtx>(
    () => ({
      role,
      scopedClientId: effectiveScopeClientId,
      setScopedClientId,
      open,
      setOpen,
      openCopilot,
      messages,
      conversationId,
      setConversationId,
      sendMessage,
      clearConversation,
      isSending,
      streamingText,
      pendingSuggestion,
      setPendingSuggestion,
      offlineQueue,
    }),
    [
      role,
      effectiveScopeClientId,
      open,
      openCopilot,
      messages,
      conversationId,
      sendMessage,
      clearConversation,
      isSending,
      streamingText,
      pendingSuggestion,
      offlineQueue,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCopilot(): CopilotCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCopilot must be used within CopilotProvider");
  return c;
}

export function useTrainerClientsForCopilot() {
  return useQuery({
    queryKey: ["copilot-trainer-clients"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("trainer_id", u.user.id).order("name");
      return data ?? [];
    },
  });
}
