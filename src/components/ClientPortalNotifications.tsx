import { useEffect, useState } from "react";
import { Bell, Check, ClipboardList, Dumbbell, MessageCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalToken } from "@/hooks/usePortalToken";

interface ClientNotification {
  id: string;
  client_id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  program: { icon: ClipboardList, color: "text-primary" },
  program_update: { icon: Dumbbell, color: "text-blue-400" },
  session_reminder: { icon: Clock, color: "text-yellow-400" },
  message: { icon: MessageCircle, color: "text-purple-400" },
};

const ClientPortalNotifications = () => {
  const { token } = usePortalToken();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!token) return;

    const fetchNotifications = async () => {
      const { data } = await supabase.rpc("get_portal_notifications", { p_token: token, p_limit: 10 });
      if (data) {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    };

    fetchNotifications();

    // Subscribe to realtime for new client notifications
    const channel = supabase
      .channel("client-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    await supabase.rpc("mark_portal_notifications_read", { p_token: token });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const timeAgo = (date: string) => {
    const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return `منذ ${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} س`;
    return `منذ ${Math.floor(h / 24)} ي`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(0_0%_15%)] bg-[hsl(0_0%_7%)] text-[hsl(0_0%_60%)] transition-colors hover:border-primary/30 hover:text-primary"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-[21rem] overflow-hidden rounded-xl border border-[hsl(0_0%_12%)] bg-[hsl(0_0%_5%)] shadow-[0_24px_80px_rgba(0,0,0,0.7)]" dir="rtl">
            <div className="flex items-center justify-between border-b border-[hsl(0_0%_12%)] px-4 py-3">
              <span className="text-sm font-bold text-white">الإشعارات</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                  تحديد الكل كمقروء
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Bell className="mx-auto h-10 w-10 text-[hsl(0_0%_20%)]" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-[hsl(0_0%_40%)]">لا توجد إشعارات جديدة</p>
              </div>
            ) : (
              <div className="max-h-[20rem] overflow-y-auto">
                {notifications.map((n) => {
                  const cfg = typeConfig[n.type] ?? { icon: Bell, color: "text-[hsl(0_0%_50%)]" };
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-[hsl(0_0%_10%)] px-4 py-3 last:border-b-0 transition-colors ${
                        n.is_read ? "bg-transparent" : "bg-primary/[0.04] border-r-2 border-r-primary"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(0_0%_15%)] bg-[hsl(0_0%_8%)] ${cfg.color}`}>
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-[hsl(0_0%_45%)]">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-[hsl(0_0%_35%)]">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClientPortalNotifications;
