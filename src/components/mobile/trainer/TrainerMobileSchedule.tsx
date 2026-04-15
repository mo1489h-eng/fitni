import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays, Check, Loader2 } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { EliteCard } from "../elite/EliteCard";
import { Pressable } from "../elite/Pressable";
import { EmptyStateIllustration } from "../elite/EmptyStateIllustration";
import { eliteSpring } from "../elite/spring";
import { ELITE } from "../workout/designTokens";
import { hapticImpact } from "../workout/haptics";

type SessionRow = {
  id: string;
  start_time: string;
  duration_minutes: number | null;
  session_type: string;
  is_completed: boolean;
  clients: { name: string } | null;
};

function clientName(s: SessionRow) {
  const c = s.clients;
  if (c && typeof c === "object" && "name" in c && c.name) return c.name;
  return "عميل";
}

const ACCENT = "#22C55E";

function ScheduleSessionSkeleton() {
  return (
    <EliteCard className="p-4">
      <div className="flex animate-pulse items-center gap-4">
        <div className="w-12 shrink-0 space-y-2">
          <div className="mx-auto h-4 w-10 rounded bg-white/[0.08]" />
          <div className="mx-auto h-3 w-8 rounded bg-white/[0.05]" />
        </div>
        <div className="h-10 w-0.5 shrink-0 rounded-full bg-white/[0.06]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/[0.08]" />
          <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
        </div>
        <div className="h-10 w-20 shrink-0 rounded-2xl bg-white/[0.06]" />
      </div>
    </EliteCard>
  );
}

const TrainerMobileSchedule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["trainer-mobile-sessions", user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trainer_sessions")
        .select("id, start_time, duration_minutes, session_type, is_completed, clients(name)")
        .eq("trainer_id", user.id)
        .eq("session_date", dateStr)
        .order("start_time");
      if (error) throw error;
      return (data || []) as SessionRow[];
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase
        .from("trainer_sessions")
        .update({
          is_completed: next,
          confirmation_status: next ? "confirmed" : "pending",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-mobile-sessions"] });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(subDays(selectedDate, selectedDate.getDay()), i);
    return d;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: ELITE.textPrimary }}>
          الجدول
        </h1>
        <span className="text-sm" style={{ color: ELITE.textSecondary }}>
          {format(selectedDate, "MMMM yyyy", { locale: ar })}
        </span>
      </div>

      <div
        className="flex items-center gap-2 rounded-[999px] border border-white/[0.06] px-2 py-2"
        style={{
          background: ELITE.glassBg,
          backdropFilter: ELITE.glassBlur,
          WebkitBackdropFilter: ELITE.glassBlur,
          boxShadow: ELITE.innerShadow,
        }}
      >
        <Pressable
          type="button"
          onClick={() => setSelectedDate(subDays(selectedDate, 7))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="الأسبوع السابق"
        >
          <ChevronRight className="h-4 w-4" style={{ color: ELITE.textSecondary }} />
        </Pressable>
        <div className="flex min-w-0 flex-1 justify-between gap-1">
          {weekDays.map((d) => {
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            return (
              <motion.button
                key={d.toISOString()}
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={eliteSpring}
                onPointerDown={() => void hapticImpact("light")}
                onClick={() => setSelectedDate(d)}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[999px] px-1 py-2"
                style={{
                  background: isSelected ? "rgba(34,197,94,0.22)" : "transparent",
                  boxShadow: isSelected ? "0 0 0 1px rgba(34,197,94,0.45)" : undefined,
                }}
              >
                <span className="text-[10px] font-medium uppercase" style={{ color: ELITE.textSecondary }}>
                  {format(d, "EEE", { locale: ar }).slice(0, 2)}
                </span>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    color: isSelected ? "#FFFFFF" : isToday ? ELITE.textPrimary : ELITE.textTertiary,
                    background:
                      isToday && !isSelected ? "rgba(255,255,255,0.1)" : isSelected ? ACCENT : "transparent",
                  }}
                >
                  {format(d, "d")}
                </span>
              </motion.button>
            );
          })}
        </div>
        <Pressable
          type="button"
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="الأسبوع التالي"
        >
          <ChevronLeft className="h-4 w-4" style={{ color: ELITE.textSecondary }} />
        </Pressable>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <ScheduleSessionSkeleton />
          <ScheduleSessionSkeleton />
          <ScheduleSessionSkeleton />
        </div>
      ) : sessions.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={eliteSpring}>
          <EliteCard className="px-6 py-10 text-center">
            <EmptyStateIllustration className="mb-6" />
            <p className="text-sm font-medium" style={{ color: ELITE.textPrimary }}>
              لا توجد جلسات في هذا اليوم
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: ELITE.textSecondary }}>
              اختر يوماً آخر أو خطّط جلساتك من لوحة الويب.
            </p>
          </EliteCard>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={eliteSpring}
            >
              <EliteCard className="flex items-center gap-4 p-4">
                <div className="shrink-0 text-center" style={{ minWidth: 48 }}>
                  <p className="text-sm font-bold tabular-nums" style={{ color: ELITE.textPrimary }}>
                    {s.start_time?.slice(0, 5)}
                  </p>
                  <p className="text-[10px]" style={{ color: ELITE.textTertiary }}>
                    {s.duration_minutes ?? 60} د
                  </p>
                </div>
                <div className="h-10 w-0.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: ELITE.textPrimary }}>
                    {clientName(s)}
                  </p>
                  <p className="truncate text-xs" style={{ color: ELITE.textSecondary }}>
                    {s.session_type || "جلسة"}
                  </p>
                </div>
                <Pressable
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate({ id: s.id, next: !s.is_completed })}
                  className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold"
                  style={{
                    background: s.is_completed ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
                    color: s.is_completed ? ACCENT : ELITE.textSecondary,
                  }}
                >
                  {toggleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={2} />
                  )}
                  {s.is_completed ? "حضور" : "تسجيل حضور"}
                </Pressable>
              </EliteCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileSchedule;
