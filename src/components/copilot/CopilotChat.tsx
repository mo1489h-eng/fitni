import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Send, Loader2, Sparkles, Trash2, Check, X, Undo2,
  ClipboardEdit, Dumbbell, UtensilsCrossed, CalendarPlus, UserCog, MessageSquare,
  ChevronDown, UserCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = { role: "user" | "assistant"; content: string };

type PendingAction = {
  confirmation: string;
  action: any;
  actionLog: any;
  message?: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`;

const SUGGESTIONS = [
  { label: "عملاء غير نشطين", prompt: "من هم العملاء الذين لم يتمرنوا هذا الأسبوع؟" },
  { label: "عدّل برنامج عميل", prompt: "اعرض لي برنامج عميلي الأول وعدّله" },
  { label: "أضف جلسة للتقويم", prompt: "أضف جلسة تدريب لعميلي القادم يوم الأحد الساعة 6 مساء" },
  { label: "توصيات هذا الأسبوع", prompt: "ما هي أهم التوصيات لعملائي هذا الأسبوع؟" },
  { label: "نصيحة تدريبية", prompt: "أعطني نصيحة تدريبية متقدمة يمكنني مشاركتها مع عملائي" },
  { label: "خطة تغذية", prompt: "اقترح خطة تغذية يومية لعميل هدفه خسارة دهون مع أطعمة خليجية" },
];

const ACTION_CHIPS = [
  { label: "عدّل برنامج عميل", icon: ClipboardEdit, prompt: "أريد تعديل برنامج تدريب عميل" },
  { label: "أضف تمرين", icon: Dumbbell, prompt: "أريد إضافة تمرين جديد لبرنامج عميل" },
  { label: "عدّل السعرات", icon: UtensilsCrossed, prompt: "أريد تعديل خطة تغذية عميل" },
  { label: "أضف جلسة للتقويم", icon: CalendarPlus, prompt: "أريد إضافة جلسة تدريب للتقويم" },
  { label: "عدّل بيانات عميل", icon: UserCog, prompt: "أريد تعديل بيانات عميل" },
];

const AVATAR_COLORS = [
  "bg-emerald-600", "bg-blue-600", "bg-purple-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-cyan-600",
];

const CopilotChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastActionLogId, setLastActionLogId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(0);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: clients = [] } = useQuery({
    queryKey: ["copilot-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: savedMessages } = useQuery({
    queryKey: ["copilot-chat-messages", user?.id],
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
  }, [messages, pendingAction]);

  // Undo countdown
  useEffect(() => {
    if (undoTimer <= 0) return;
    const interval = setInterval(() => setUndoTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [undoTimer]);

  const saveMessage = async (role: string, content: string) => {
    await supabase.from("copilot_messages" as any).insert({ trainer_id: user!.id, role, content });
  };

  const clearChat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("copilot_messages" as any).delete().eq("trainer_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessages([]);
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ["copilot-chat-messages"] });
    },
  });

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setIsExecuting(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          confirm_action: pendingAction.action,
          before_state: pendingAction.actionLog?.before_state || {},
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "فشل التنفيذ");

      const successMsg = data.message || "تم التنفيذ ✅";
      setMessages(prev => [...prev, { role: "assistant", content: successMsg }]);
      await saveMessage("assistant", successMsg);
      setPendingAction(null);

      if (data.log_id) setLastActionLogId(data.log_id);
      setUndoTimer(30);

      toast({ title: "تم التنفيذ", description: successMsg });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
    setMessages(prev => [...prev, { role: "assistant", content: "تم الإلغاء ❌" }]);
  };

  const undoLastAction = async () => {
    if (!lastActionLogId) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ undo_action: true, action_log_id: lastActionLogId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: "تم التراجع عن العملية ↩️" }]);
      setLastActionLogId(null);
      setUndoTimer(0);
      toast({ title: "تم التراجع", description: "تمت استعادة الحالة السابقة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setPendingAction(null);

    await saveMessage("user", userMsg.content);

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "فشل الاتصال");
      }

      const contentType = resp.headers.get("content-type") || "";

      // Check if it's a pending action (JSON response)
      if (contentType.includes("application/json")) {
        const data = await resp.json();

        if (data.type === "pending_action") {
          // Show confirmation UI
          if (data.message) {
            setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
          }
          setPendingAction({
            confirmation: data.confirmation,
            action: data.action,
            actionLog: data.actionLog,
            message: data.message,
          });
          setIsStreaming(false);
          return;
        }

        // Regular JSON error
        if (data.error) throw new Error(data.error);
        return;
      }

      // SSE streaming response
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

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
            <h3 className="text-lg font-bold text-foreground mb-1">AI Agent - وكيلك الذكي</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              يمكنني قراءة وتعديل بياناتك: برامج التدريب، التغذية، الجلسات، وبيانات العملاء
            </p>
            {/* Action chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {ACTION_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.prompt)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                >
                  <chip.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {chip.label}
                </button>
              ))}
            </div>
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
                  <span className="text-[10px] font-medium text-primary">AI Agent</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}</p>
            </div>
          </div>
        ))}

        {/* Pending Action Confirmation Card */}
        {pendingAction && (
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-2xl border-2 border-primary/30 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium text-primary">تأكيد الإجراء</span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground mb-4 bg-muted/30 rounded-lg p-3">
                {pendingAction.confirmation}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelAction}
                  disabled={isExecuting}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 ml-1" strokeWidth={1.5} />
                  إلغاء
                </Button>
                <Button
                  size="sm"
                  onClick={confirmAction}
                  disabled={isExecuting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  ) : (
                    <Check className="w-4 h-4 ml-1" strokeWidth={1.5} />
                  )}
                  {isExecuting ? "جاري التنفيذ..." : "تأكيد"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Undo bar */}
      {undoTimer > 0 && lastActionLogId && (
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg border border-border bg-card">
          <span className="text-xs text-muted-foreground">تراجع خلال {undoTimer} ثانية</span>
          <Button variant="ghost" size="sm" onClick={undoLastAction} className="text-xs gap-1 h-7">
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            تراجع
          </Button>
        </div>
      )}

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
            placeholder="اكتب أمرك... (مثال: عدّل برنامج أحمد)"
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isStreaming || isExecuting}
          />
        </div>
        <Button
          size="icon"
          className="shrink-0 rounded-xl"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming || isExecuting}
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
        </Button>
      </div>
    </div>
  );
};

export default CopilotChat;
