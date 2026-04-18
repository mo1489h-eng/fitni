import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Bell, Check, CheckCircle, CreditCard, MessageCircle, Sparkles, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  trainer_id: string;
  client_id: string | null;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  payment: { icon: CreditCard, color: "text-primary" },
  new_client: { icon: UserPlus, color: "text-blue-400" },
  expiring: { icon: AlertCircle, color: "text-warning" },
  copilot: { icon: Sparkles, color: "text-muted-foreground" },
  workout: { icon: CheckCircle, color: "text-primary" },
  message: { icon: MessageCircle, color: "text-muted-foreground" },
  body_scan: { icon: CheckCircle, color: "text-primary" },
  progress_photo: { icon: CheckCircle, color: "text-primary" },
  weight: { icon: CheckCircle, color: "text-primary" },
};

const TrainerNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("trainer_notifications")
        .select("*")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data as Notification[]);
    };

    fetch();

    const channel = supabase
      .channel("trainer-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trainer_notifications", filter: `trainer_id=eq.${user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("trainer_notifications").update({ is_read: true }).eq("trainer_id", user.id).eq("is_read", false);
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
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-3 w-[23rem] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.7)]" dir="rtl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-sm font-bold text-foreground">الإشعارات</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:bg-transparent" onClick={markAllRead}>
                  <Check className="ml-1 h-3.5 w-3.5" strokeWidth={1.5} />
                  تحديد الكل كمقروء
                </Button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="max-h-[24rem] overflow-y-auto">
                {notifications.map((n) => {
                  const cfg = typeConfig[n.type] ?? { icon: Bell, color: "text-muted-foreground" };
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-border px-5 py-4 last:border-b-0 transition-colors ${
                        n.is_read ? "bg-card" : "bg-primary/[0.03] border-r-2 border-r-primary"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background ${cfg.color}`}>
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {n.client_id ? (
                          <Link to={`/clients/${n.client_id}`} onClick={() => setOpen(false)} className="block hover:opacity-80">
                            <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        )}
                        {n.body && <p className="mt-1 text-xs leading-6 text-muted-foreground">{n.body}</p>}
                        <p className="mt-2 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
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

export default TrainerNotifications;
