import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCopilot } from "./useCopilot";
import { CB } from "../workout/designTokens";

export type CopilotAlertItem = {
  id: string;
  type: "warning" | "info" | "success";
  message: string;
  action: string;
};

export function useCopilotAlertsData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["copilot-alerts-daily", user?.id],
    staleTime: 86_400_000,
    queryFn: async (): Promise<CopilotAlertItem[]> => {
      if (!user?.id) return [];
      const { data: clients, error } = await supabase
        .from("clients")
        .select("id, name, last_workout_date, subscription_end_date")
        .eq("trainer_id", user.id);
      if (error || !clients?.length) return [];

      const now = Date.now();
      const out: CopilotAlertItem[] = [];

      for (const c of clients) {
        const last = c.last_workout_date ? new Date(c.last_workout_date).getTime() : null;
        const days = last == null ? 999 : Math.floor((now - last) / 86400000);
        if (days >= 3) {
          out.push({
            id: `inactive-${c.id}`,
            type: "warning",
            message: `${c.name} لم يتدرب منذ ${days} أيام`,
            action: "راسله الآن",
          });
        }
        const sub = c.subscription_end_date ? new Date(c.subscription_end_date).getTime() : null;
        if (sub != null) {
          const left = Math.ceil((sub - now) / 86400000);
          if (left >= 0 && left <= 7) {
            out.push({
              id: `sub-${c.id}`,
              type: "info",
              message: `اشتراك ${c.name} ينتهي خلال ${left} يوم`,
              action: "تجديد",
            });
          }
        }
      }

      const weekAgo = new Date(now - 7 * 86400000).toISOString();
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("total_volume, started_at")
        .gte("started_at", weekAgo)
        .not("completed_at", "is", null)
        .order("total_volume", { ascending: false })
        .limit(8);

      const seen = new Set<string>();
      for (const s of (sessions ?? []) as { total_volume?: number; started_at?: string }[]) {
        const vol = s.total_volume ?? 0;
        const key = `vol-${vol}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: `vol-${s.started_at}-${vol}`,
          type: "success",
          message: `🏆 جلسة مميزة (${Math.round(vol)} كجم حجم) هذا الأسبوع`,
          action: "شاركه",
        });
      }

      return out.slice(0, 12);
    },
    enabled: !!user?.id,
  });
}

export default function CopilotAlerts() {
  const { data: alerts = [], isLoading } = useCopilotAlertsData();
  const { setOpen, setPendingSuggestion } = useCopilot();

  const hasAlerts = alerts.length > 0;

  const borderFor = (t: CopilotAlertItem["type"]) => {
    if (t === "warning") return "rgba(245, 158, 11, 0.45)";
    if (t === "info") return "rgba(59, 130, 246, 0.45)";
    return "rgba(79,111,82, 0.45)";
  };

  const list = useMemo(() => alerts, [alerts]);

  if (isLoading) {
    return (
      <div className="mb-4 h-16 animate-pulse rounded-2xl" style={{ background: CB.card }} />
    );
  }

  if (!hasAlerts) return null;

  return (
    <div className="mb-4 space-y-2">
      <p className="text-sm font-bold text-white">تنبيهات CoachBase AI</p>
      {list.map((a) => (
        <button
          key={a.id}
          type="button"
          className="w-full rounded-xl border p-3 text-right transition active:scale-[0.99]"
          style={{ background: CB.card, borderColor: borderFor(a.type) }}
          onClick={() => {
            setPendingSuggestion(true);
            setOpen(true);
          }}
        >
          <p className="text-[13px] leading-snug text-white">{a.message}</p>
          <p className="mt-2 text-[12px] font-semibold" style={{ color: CB.accent }}>
            {a.action} ←
          </p>
        </button>
      ))}
    </div>
  );
}
