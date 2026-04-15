import { useEffect, useRef, useState } from "react";
import { X, Send, Trash2, Mic } from "lucide-react";
import {
  useCopilot,
  useTrainerClientsForCopilot,
  type CopilotContextKind,
} from "./useCopilot";
import SimpleArabicMarkdown from "./SimpleArabicMarkdown";
import { CB } from "../workout/designTokens";
import { CoachBaseAIMark } from "@/components/brand/CoachBaseAIMark";

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
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, open, isSending]);

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

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: CB.bg }}
      dir="rtl"
    >
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "rgba(255,255,255,0.08)", paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="min-w-0 flex-1">
          <CoachBaseAIMark size="sm" className="!gap-1.5" />
          <p className="mt-1 text-[10px] text-white/45">CoachBase AI Assistant</p>
          {role === "trainer" && (
            <select
              className="mt-2 w-full max-w-[220px] rounded-lg border-0 px-3 py-2 text-sm text-white outline-none"
              style={{ background: CB.card2 }}
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
        <button
          type="button"
          className="rounded-lg p-2 text-white/80"
          style={{ background: CB.card }}
          onClick={() => void clearConversation()}
          aria-label="مسح المحادثة"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-white"
          style={{ background: CB.card2 }}
          onClick={() => setOpen(false)}
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-[15px] ${
                m.role === "user" ? "self-end" : "self-start border"
              }`}
              style={
                m.role === "user"
                  ? { background: "#22C55E", color: "#0a0a0a" }
                  : { background: "#161616", borderColor: "rgba(255,255,255,0.1)", color: "#eee" }
              }
              dir="rtl"
            >
              {m.role === "assistant" ? (
                <SimpleArabicMarkdown text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          ))}
          {isSending && streamingText && (
            <div
              className="max-w-[92%] self-start rounded-2xl border px-4 py-3 text-[15px] text-white/90"
              style={{ background: "#161616", borderColor: "rgba(255,255,255,0.1)" }}
              dir="rtl"
            >
              <SimpleArabicMarkdown text={streamingText} />
            </div>
          )}
          {isSending && !streamingText && (
            <div className="flex gap-1 self-start rounded-2xl px-4 py-3" style={{ background: "#161616" }}>
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-3 flex max-w-lg flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              className="rounded-full px-3 py-1.5 text-[12px] text-white/90"
              style={{ background: CB.card2, border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={() => void sendMessage(c, "general" as CopilotContextKind)}
              disabled={isSending}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <button
            type="button"
            className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl opacity-40"
            style={{ background: CB.card2 }}
            disabled
            title="قريباً"
            aria-label="إدخال صوتي"
          >
            <Mic className="h-5 w-5 text-white" />
          </button>
          <textarea
            className="min-h-[48px] flex-1 resize-none rounded-xl border-0 px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none"
            style={{ background: CB.card2 }}
            placeholder="اكتب سؤالك…"
            dir="rtl"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            type="button"
            className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: CB.gradient }}
            disabled={!input.trim() || isSending}
            onClick={onSend}
            aria-label="إرسال"
          >
            <Send className="h-5 w-5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
