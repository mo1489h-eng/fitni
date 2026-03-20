import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Send, Loader2, Sparkles, Trash2, MessageSquare,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`;

const SUGGESTIONS = [
  { label: "عملاء غير نشطين", prompt: "من هم العملاء الذين لم يتمرنوا هذا الأسبوع؟" },
  { label: "توصيات هذا الأسبوع", prompt: "ما هي أهم التوصيات لعملائي هذا الأسبوع؟" },
  { label: "نصيحة تدريبية", prompt: "أعطني نصيحة تدريبية متقدمة يمكنني مشاركتها مع عملائي" },
  { label: "خطة تغذية", prompt: "اقترح خطة تغذية يومية لعميل هدفه خسارة دهون مع أطعمة خليجية" },
];

const CopilotChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved messages
  const { data: savedMessages } = useQuery({
    queryKey: ["copilot-chat-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_messages" as any)
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data as any[]).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (savedMessages && savedMessages.length > 0 && messages.length === 0) {
      setMessages(savedMessages);
    }
  }, [savedMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveMessage = async (role: string, content: string) => {
    await supabase.from("copilot_messages" as any).insert({
      trainer_id: user!.id,
      role,
      content,
    });
  };

  const clearChat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("copilot_messages" as any)
        .delete()
        .eq("trainer_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["copilot-chat-messages"] });
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    await saveMessage("user", userMsg.content);

    let assistantContent = "";

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "فشل الاتصال");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: finalContent };
                return copy;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: finalContent };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (assistantContent) {
        await saveMessage("assistant", assistantContent);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => m.content !== ""),
        { role: "assistant", content: `حدث خطأ: ${err.message}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">مرحباً بك في شات الكوبايلت</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              اسألني عن عملائك، برامجهم، أو أي نصيحة تدريبية
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-card border border-border text-card-foreground rounded-bl-md"
            }`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-primary" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium text-primary">الكوبايلت</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => sendMessage(s.prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 border-t border-border pt-3">
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => clearChat.mutate()}
            disabled={clearChat.isPending || isStreaming}
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        )}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك..."
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isStreaming}
          />
        </div>
        <Button
          size="icon"
          className="shrink-0 rounded-xl"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
        </Button>
      </div>
    </div>
  );
};

export default CopilotChat;
