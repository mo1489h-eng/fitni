import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Play, User, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type SessionRow = {
  id: string;
  start_time: string;
  clients: { id: string; name: string } | null;
};

function clientFromRow(s: SessionRow) {
  const c = s.clients;
  if (c && typeof c === "object" && "id" in c && "name" in c) return c;
  return null;
}

/**
 * Shortcut to TrainerSessionPage: lists today's scheduled clients or empty CTA.
 */
export default function TrainerMobileSessionHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE d MMMM", { locale: ar });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["trainer-mobile-session-hub", user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trainer_sessions")
        .select("id, start_time, clients(id, name)")
        .eq("trainer_id", user.id)
        .eq("session_date", dateStr)
        .order("start_time");
      if (error) throw error;
      return (data || []) as SessionRow[];
    },
    enabled: !!user,
  });

  const startWith = (clientId: string) => {
    navigate(`/coach/trainer/session?clientId=${encodeURIComponent(clientId)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin" style={{ color: "#4f6f52" }} />
        <p className="text-sm text-white/50">جاري التحميل…</p>
      </div>
    );
  }

  const withClient = sessions.map((s) => ({ session: s, client: clientFromRow(s) })).filter((x) => x.client);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">جلسة</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-white/50">
          <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {todayLabel}
        </p>
      </div>

      {withClient.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] px-5 py-12 text-center" style={{ background: "#0A0A0A" }}>
          <p className="text-base font-medium text-white/90">اختر عميلاً لبدء الجلسة</p>
          <p className="mt-2 text-sm text-white/45">لا توجد جلسات مجدولة اليوم في التقويم.</p>
          <p className="mt-1 text-xs text-white/35">افتح تبويب «العملاء» واختر عميلاً لديه برنامج، ثم ابدأ وضع الجلسة من هناك.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">عملاء اليوم</p>
          <ul className="space-y-2">
            {withClient.map(({ session: s, client: c }) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => startWith(c!.id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-right transition active:scale-[0.99]"
                  style={{ background: "#111111" }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(79,111,82,0.15)", color: "#4f6f52" }}
                  >
                    <User className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{c!.name}</p>
                    <p className="text-xs text-white/45">{s.start_time?.slice(0, 5) ?? "—"}</p>
                  </div>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(79,111,82,0.2)", color: "#4f6f52" }}
                  >
                    <Play className="h-5 w-5" strokeWidth={2} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
