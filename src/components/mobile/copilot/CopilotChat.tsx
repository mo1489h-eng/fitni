import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Send, Trash2, Mic } from "lucide-react";
import { motion } from "framer-motion";
import {
  useCopilot,
  useTrainerClientsForCopilot,
  type CopilotContextKind,
} from "./useCopilot";
import SimpleArabicMarkdown from "./SimpleArabicMarkdown";
import { CB, ELITE } from "../workout/designTokens";
import { CoachBaseAIMark } from "@/components/brand/CoachBaseAIMark";
import { Pressable } from "../elite/Pressable";
import { eliteSpring } from "../elite/spring";
import { hapticImpact } from "../workout/haptics";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BUBBLE_TEXT = "text-[15px] leading-[1.6]";

/** Physical left: assistant (RTL column → self-end). Physical right: user (self-start). */
function ChatBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={eliteSpring}
      className={cn("relative max-w-[88%] rounded-[20px] px-4 py-2.5", BUBBLE_TEXT, isUser ? "self-start" : "self-end")}
      style={
        isUser
          ? {
              background: "linear-gradient(135deg, #059669 0%, #0f766e 50%, #0f766e 100%)",
              color: "#ffffff",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            }
          : {
              background: "rgba(255, 255, 255, 0.05)",
              color: "rgba(255, 255, 255, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }
      }
      dir="rtl"
    >
      {children}
    </motion.div>
  );
}

function AIThinkingIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={eliteSpring}
      className={cn("relative self-end", className)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-1 rounded-[22px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(34,197,94,0.35), transparent 70%)",
        }}
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="relative flex items-center gap-1.5 rounded-[20px] border border-white/10 px-4 py-3"
        style={{ background: "rgba(255,255,255,0.05)", boxShadow: ELITE.innerShadow }}
      >
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400/90"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400/90"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-emerald-400/90"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", delay: 0.24 }}
        />
      </div>
    </motion.div>
  );
}

export default function CopilotChat() {
  const {
    role,
    scopedClientId,
    setScopedClientId,
    open,
    setOpen,
    messages,
    sendMessage,
    clearConversation,
    isSending,
    streamingText,
  } = useCopilot();

  const { data: clients = [] } = useTrainerClientsForCopilot();
  const { resolvedFitniRole: fitniRole } = useAuth();
  const [input, setInput] = useState("");
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevLenRef = useRef(0);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prevLenRef.current = 0;
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) prevLenRef.current = 0;
    prevOpenRef.current = true;

    if (messages.length > prevLenRef.current && prevLenRef.current > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") void hapticImpact("light");
    }
    prevLenRef.current = messages.length;
  }, [messages, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, open, isSending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineH = 24;
    const maxH = lineH * 5;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [input]);

  if (!open) return null;

  const trainerChips = [
    "من لم يتدرب اليوم؟",
    scopedClientId
      ? `اقترح برنامج لـ ${clients.find((c) => c.id === scopedClientId)?.name ?? "العميل"}`
      : "اقترح برنامج للعميل المحدد",
    "كيف تقدم عملائي هذا الأسبوع؟",
    "من يحتاج تعديل برنامجه؟",
  ];

  const clientChips = [
    "كيف كان أدائي اليوم؟",
    "هل أزيد الأوزان؟",
    "أي عضلة تحتاج راحة؟",
    "ما تمرين غداً؟",
  ];

  const chips = role === "trainer" ? trainerChips : clientChips;

  const onSend = () => {
    const t = input.trim();
    if (!t || isSending) return;
    setInput("");
    void sendMessage(t, "general");
  };

  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const lastWasAssistant = lastMessage?.role === "assistant";
  const lastWasUser = lastMessage?.role === "user";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black" dir="rtl">
      <header
        className={cn(
          "z-40 flex shrink-0 items-center gap-3 border-b px-4 py-4 transition-shadow",
          headerScrolled && "shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        )}
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          paddingTop: "max(16px, env(safe-area-inset-top))",
          background: "rgba(8,8,8,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="min-w-0 flex-1">
          <CoachBaseAIMark size="sm" className="!gap-2" />
          <p className="mt-1 text-[10px] font-medium tracking-wide" style={{ color: ELITE.textSecondary }}>
            CoachBase AI Assistant
          </p>
          <p className="text-[10px]" style={{ color: ELITE.textTertiary }}>
            Powered by AI · CoachBase
          </p>
          <p className="mt-0.5 max-w-[240px] text-[10px] leading-snug" style={{ color: ELITE.textTertiary }}>
            {fitniRole === "coach"
              ? "ملخص أداء فريقك — اسأل عن عملائك وبرامجهم."
              : "جاهز لجلسة اليوم؟ اسأل عن تمرينك وتقدّمك."}
          </p>
          {role === "trainer" && (
            <select
              className="mt-2 w-full max-w-[220px] rounded-2xl border-0 px-4 py-3 text-sm text-white outline-none"
              style={{ background: CB.card2, boxShadow: ELITE.innerShadow }}
              value={scopedClientId ?? ""}
              onChange={(e) => setScopedClientId(e.target.value || null)}
            >
              <option value="">جميع العملاء</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <Pressable
          className="rounded-2xl p-3 text-white/80"
          style={{ background: CB.card }}
          onClick={() => void clearConversation()}
          aria-label="مسح المحادثة"
        >
          <Trash2 className="h-5 w-5" />
        </Pressable>
        <Pressable className="rounded-2xl p-3 text-white" style={{ background: CB.card2 }} onClick={() => setOpen(false)} aria-label="إغلاق">
          <X className="h-5 w-5" />
        </Pressable>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        onScroll={(e) => setHeaderScrolled(e.currentTarget.scrollTop > 8)}
      >
        <div className="mx-auto flex max-w-lg flex-col">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const samePrev = i > 0 && messages[i - 1].role === m.role;
            return (
              <div key={m.id} className={cn("flex flex-col", samePrev ? "mt-1" : "mt-4")}>
                <ChatBubble role={isUser ? "user" : "assistant"}>
                  {m.role === "assistant" ? (
                    <SimpleArabicMarkdown text={m.content} className="!leading-[1.6] [&_p]:leading-[1.6]" />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </ChatBubble>
              </div>
            );
          })}

          {isSending && streamingText && (
            <div className={cn("flex flex-col", lastWasAssistant ? "mt-1" : "mt-4")}>
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={eliteSpring}
                className="self-end max-w-[88%] rounded-[20px] border border-white/10 px-4 py-2.5 text-[15px] leading-[1.6]"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255, 255, 255, 0.95)",
                  boxShadow: ELITE.innerShadow,
                }}
                dir="rtl"
              >
                <div className="flex flex-wrap items-end gap-x-1 gap-y-0">
                  <div className="min-w-0 flex-1">
                    <SimpleArabicMarkdown text={streamingText} className="!leading-[1.6] [&_p]:leading-[1.6]" />
                  </div>
                  <span
                    className="mb-0.5 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-full"
                    style={{ background: "rgba(52, 211, 153, 0.95)" }}
                    aria-hidden
                  />
                </div>
              </motion.div>
            </div>
          )}

          {isSending && !streamingText && (
            <AIThinkingIndicator className={cn(lastWasUser ? "mt-4" : "mt-1")} />
          )}

          <div ref={bottomRef} className="h-4 shrink-0" />
        </div>
      </div>

      <div
        className="shrink-0 px-4 pb-4 pt-2"
        style={{
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 12%, rgba(0,0,0,0.92) 100%)",
        }}
      >
        <div className="mx-auto mb-3 max-w-lg">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: ELITE.textTertiary }}>
            اقتراحات سريعة
          </p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((c) => (
              <Pressable
                key={c}
                className="shrink-0 rounded-full px-4 py-2.5 text-[12px] font-medium text-white/95"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 0 24px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
                onClick={() => void sendMessage(c, "general" as CopilotContextKind)}
                disabled={isSending}
              >
                {c}
              </Pressable>
            ))}
          </div>
        </div>

        <div
          className="mx-auto max-w-lg rounded-[24px] border border-white/[0.05] p-2"
          style={{
            background: ELITE.glassBg,
            backdropFilter: ELITE.glassBlur,
            WebkitBackdropFilter: ELITE.glassBlur,
            boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-end gap-2">
            <motion.div
              animate={
                voiceActive
                  ? {
                      boxShadow: [
                        "0 0 0 0 rgba(34,197,94,0.45)",
                        "0 0 0 10px rgba(34,197,94,0)",
                        "0 0 0 0 rgba(34,197,94,0)",
                      ],
                    }
                  : {}
              }
              transition={voiceActive ? { duration: 1.4, repeat: Infinity } : {}}
              className="rounded-2xl"
            >
              <Pressable
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  voiceActive ? "text-emerald-400" : "text-white/50"
                )}
                style={{ background: voiceActive ? "rgba(34,197,94,0.15)" : CB.card2 }}
                aria-pressed={voiceActive}
                aria-label="إدخال صوتي"
                title="تبديل وضع الصوت (قريباً)"
                onClick={() => setVoiceActive((v) => !v)}
              >
                <Mic className="h-5 w-5" />
              </Pressable>
            </motion.div>
            <textarea
              ref={textareaRef}
              rows={1}
              className="min-h-[48px] max-h-[120px] flex-1 resize-none rounded-2xl border-0 bg-transparent px-3 py-3 text-[15px] leading-[1.6] text-white placeholder:text-white/35 outline-none"
              placeholder="اكتب سؤالك…"
              dir="rtl"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Pressable
              className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl disabled:opacity-40"
              style={{ background: CB.gradient }}
              disabled={!input.trim() || isSending}
              onClick={onSend}
              aria-label="إرسال"
            >
              <Send className="h-5 w-5 text-black" />
            </Pressable>
          </div>
        </div>
      </div>
    </div>
  );
}
