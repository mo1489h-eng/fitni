import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toYmd, currentStreak, setVolumeKg } from "@/lib/analytics/calculations";

export type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  subscription_end_date: string;
  subscription_price: number;
  last_workout_date: string;
  created_at: string;
};

export type TrainerAnalytics = {
  clients: ClientRow[];
  sessions: {
    id: string;
    client_id: string;
    started_at: string;
    completed_at: string | null;
    total_volume: number | null;
  }[];
  sessionExerciseVolumes: { client_id: string; session_id: string; started_at: string; volume: number }[];
  payments: { created_at: string; amount: number; status: string }[];
};

async function fetchTrainerAnalytics(): Promise<TrainerAnalytics> {
  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, name, phone, subscription_end_date, subscription_price, last_workout_date, created_at")
    .order("created_at", { ascending: false });

  if (cErr) throw cErr;

  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const { data: sessions, error: sErr } = await supabase
    .from("workout_sessions")
    .select("id, client_id, started_at, completed_at, total_volume")
    .not("completed_at", "is", null)
    .gte("started_at", since.toISOString());

  if (sErr) throw sErr;

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const sessionExerciseVolumes: TrainerAnalytics["sessionExerciseVolumes"] = [];

  if (sessionIds.length > 0) {
    const wseParts: any[] = [];
    const chunk = 150;
    for (let i = 0; i < sessionIds.length; i += chunk) {
      const part = sessionIds.slice(i, i + chunk);
      const { data: wse, error: wErr } = await supabase
        .from("workout_session_exercises")
        .select("session_id, weight_used, reps_completed, completed_at")
        .in("session_id", part);
      if (wErr) throw wErr;
      wseParts.push(...(wse ?? []));
    }
    const wse = wseParts;
    const sidToClient = new Map((sessions ?? []).map((s: any) => [s.id, s]));

    const volMap = new Map<string, { client_id: string; started_at: string; vol: number }>();
    (wse ?? []).forEach((row: any) => {
      const s = sidToClient.get(row.session_id) as { client_id: string; started_at: string } | undefined;
      if (!s) return;
      const v = setVolumeKg(Number(row.weight_used) || 0, Number(row.reps_completed) || 0);
      const k = row.session_id;
      const prev = volMap.get(k);
      if (!prev) volMap.set(k, { client_id: s.client_id, started_at: s.started_at, vol: v });
      else prev.vol += v;
    });
    volMap.forEach((val, session_id) => {
      sessionExerciseVolumes.push({
        client_id: val.client_id,
        session_id,
        started_at: val.started_at,
        volume: val.vol,
      });
    });
  }

  const { data: payments, error: pErr } = await supabase
    .from("client_payments")
    .select("created_at, amount, status")
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  if (pErr) throw pErr;

  return {
    clients: (clients ?? []) as ClientRow[],
    sessions: (sessions ?? []) as TrainerAnalytics["sessions"],
    sessionExerciseVolumes,
    payments: (payments ?? []) as TrainerAnalytics["payments"],
  };
}

export function useTrainerAnalyticsData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trainer-analytics-v2", user?.id],
    queryFn: fetchTrainerAnalytics,
    enabled: !!user,
  });
}

export function activeClientsNow(clients: ClientRow[]): ClientRow[] {
  const now = Date.now();
  return clients.filter((c) => new Date(c.subscription_end_date).getTime() >= now);
}

export function subscriptionDonut(clients: ClientRow[]): { name: string; value: number; fill: string }[] {
  const now = new Date();
  let active = 0;
  let expiring = 0;
  let expired = 0;
  clients.forEach((c) => {
    const end = new Date(c.subscription_end_date);
    const days = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    if (days < 0) expired += 1;
    else if (days <= 7) expiring += 1;
    else active += 1;
  });
  return [
    { name: "نشط", value: active, fill: "#22c55e" },
    { name: "ينتهي ≤7 أيام", value: expiring, fill: "#eab308" },
    { name: "منتهي", value: expired, fill: "#ef4444" },
  ].filter((x) => x.value > 0);
}

export function monthlyRevenueSeries(
  payments: { created_at: string; amount: number }[],
  months = 12
): { key: string; label: string; amount: number }[] {
  const today = new Date();
  const out: { key: string; label: string; amount: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = new Intl.DateTimeFormat("ar-SA", { month: "short" }).format(d);
    out.push({ key, label, amount: 0 });
  }
  payments.forEach((p) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const t = out.find((o) => o.key === key);
    if (t) t.amount += Number(p.amount) || 0;
  });
  return out;
}

export function projectedMRR(clients: ClientRow[]): number {
  return activeClientsNow(clients).reduce((s, c) => s + (Number(c.subscription_price) || 0), 0);
}

export function leaderboardRows(
  clients: ClientRow[],
  sessions: { client_id: string; started_at: string }[],
  volumes: { client_id: string; started_at: string; volume: number }[]
) {
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const volByClient = new Map<string, number>();
  volumes.forEach((v) => {
    if (new Date(v.started_at) >= mStart) {
      volByClient.set(v.client_id, (volByClient.get(v.client_id) ?? 0) + v.volume);
    }
  });

  const daysByClient = new Map<string, Set<string>>();
  sessions.forEach((s) => {
    const set = daysByClient.get(s.client_id) ?? new Set<string>();
    set.add(toYmd(new Date(s.started_at)));
    daysByClient.set(s.client_id, set);
  });

  return clients.map((c) => {
    const days = daysByClient.get(c.id) ?? new Set<string>();
    const streak = currentStreak([...days].sort());
    const vol = volByClient.get(c.id) ?? 0;
    const lastMs = new Date(c.last_workout_date).getTime();
    const inactiveDays = Math.ceil((Date.now() - lastMs) / 86400000);
    const compliance = Math.max(0, Math.min(100, 100 - Math.min(100, inactiveDays * 8)));
    return {
      id: c.id,
      name: c.name,
      volumeMonth: vol,
      streak,
      compliance,
      inactiveDays,
    };
  });
}

export function churnLastMonth(clients: ClientRow[]): { churned: number; rate: number } {
  const now = new Date();
  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
  let churned = 0;
  clients.forEach((c) => {
    const end = new Date(c.subscription_end_date);
    if (end >= startLast && end <= endLast) churned += 1;
  });
  const activeLastMonth = clients.filter((c) => new Date(c.created_at) <= endLast).length || 1;
  return { churned, rate: Math.round((churned / activeLastMonth) * 1000) / 10 };
}

export function activeClientsByMonth(clients: ClientRow[], months = 12): { key: string; label: string; count: number }[] {
  const today = new Date();
  const series: { key: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
    const label = new Intl.DateTimeFormat("ar-SA", { month: "short", year: "2-digit" }).format(monthEnd);
    const key = `${monthEnd.getFullYear()}-${monthEnd.getMonth()}`;
    const count = clients.filter(
      (c) =>
        new Date(c.created_at) <= monthEnd && new Date(c.subscription_end_date) >= new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1)
    ).length;
    series.push({ key, label, count });
  }
  return series;
}

export function heatmapAllClients(
  sessions: { started_at: string }[],
  days = 180
): Map<string, number> {
  const map = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  sessions.forEach((s) => {
    const d = new Date(s.started_at);
    if (d < cutoff) return;
    const key = toYmd(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}
