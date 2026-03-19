import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Bell, Camera, Check, Dumbbell, Scale, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const iconMap: Record<string, typeof Bell> = {
  body_scan: ScanLine,
  progress_photo: Camera,
  weight: Scale,
  workout: Dumbbell,
};

const iconWrapperClasses = "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-primary";

const TrainerNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("trainer_notifications")
        .select("*")
        .eq("trainer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setNotifications(data as Notification[]);
    };

    fetchNotifications();

    const channel = supabase
      .channel("trainer-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trainer_notifications",
          filter: `trainer_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((previous) => [payload.new as Notification, ...previous].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;

    await supabase.from("trainer_notifications").update({ is_read: true }).eq("trainer_id", user.id).eq("is_read", false);
    setNotifications((previous) => previous.map((notification) => ({ ...notification, is_read: true })));
  };

  const timeAgo = (date: string) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    return `منذ ${Math.floor(hours / 24)} ي`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute left-0 top-full z-50 mt-3 w-[22rem] overflow-hidden border-border bg-card shadow-[0_24px_80px_hsl(var(--background)/0.7)]" dir="rtl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-primary" strokeWidth={1.5} />
                النشاط والإشعارات
              </div>
              {unreadCount > 0 ? (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:text-primary" onClick={markAllRead}>
                  <Check className="ml-1 h-3.5 w-3.5" strokeWidth={1.5} />
                  تعليم الكل كمقروء
                </Button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-muted-foreground">لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              <div className="max-h-[24rem] overflow-y-auto">
                {notifications.map((notification) => {
                  const NotificationIcon = iconMap[notification.type] ?? Bell;

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 border-b border-border px-4 py-4 last:border-b-0 ${notification.is_read ? "bg-card" : "bg-primary/5"}`}
                    >
                      <div className={iconWrapperClasses}>
                        <NotificationIcon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {notification.client_id ? (
                          <Link to={`/clients/${notification.client_id}`} onClick={() => setOpen(false)} className="block hover:opacity-80">
                            <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        )}
                        {notification.body ? <p className="mt-1 text-xs leading-6 text-muted-foreground">{notification.body}</p> : null}
                        <p className="mt-2 text-[11px] text-muted-foreground">{timeAgo(notification.created_at)}</p>
                      </div>
                      {!notification.is_read ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default TrainerNotifications;
