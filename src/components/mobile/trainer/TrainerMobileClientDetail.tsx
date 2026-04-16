import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  ChevronRight,
  Phone,
  Target,
  Dumbbell,
  CalendarDays,
  MessageCircle,
  Loader2,
  Check,
  X,
  Play,
} from "lucide-react";
import TrainerLiveSession from "../workout/TrainerLiveSession";
import MuscleRecoveryMap from "../workout/MuscleRecoveryMap";
import SessionMode from "@/pages/SessionMode";
import { parseClientTrainingType, TRAINING_TYPE_LABEL_AR } from "@/lib/training-type";

type Props = {
  clientId: string;
  onBack: () => void;
};

const TrainerMobileClientDetail = ({ clientId, onBack }: Props) => {
  const { user } = useAuth();
  const [liveSessionOpen, setLiveSessionOpen] = useState(false);
  const [sessionModeOpen, setSessionModeOpen] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["trainer-client-detail", clientId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          id, name, goal, phone, email, program_id, week_number, days_per_week,
          programs ( id, name, weeks, delivery_mode )
        `
        )
        .eq("id", clientId)
        .eq("trainer_id", user.id)
        .single();
      if (error) throw error;
      return data as unknown as {
        id: string;
        name: string;
        goal: string;
        phone: string;
        email: string | null;
        program_id: string | null;
        week_number: number | null;
        days_per_week: number | null;
        programs: { id: string; name: string; weeks: number | null; delivery_mode?: string } | null;
      };
    },
    enabled: !!user && !!clientId,
  });

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ["trainer-client-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_sessions")
        .select("id, session_date, start_time, session_type, is_completed")
        .eq("client_id", clientId)
        .order("session_date", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: lastWorkouts = [] } = useQuery({
    queryKey: ["trainer-client-last-workouts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, completed_at, total_volume, duration_minutes, started_at")
        .eq("client_id", clientId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const openWhatsApp = () => {
    if (!client?.phone) return;
    const n = client.phone.replace(/\D/g, "");
    const intl = n.startsWith("0") ? `966${n.slice(1)}` : n;
    window.open(`https://wa.me/${intl}`, "_blank", "noopener,noreferrer");
  };

  const openEmail = () => {
    if (!client?.email) return;
    window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent("CoachBase")}`;
  };

  if (isLoading || !client) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#22C55E" }} />
      </div>
    );
  }

  const program = Array.isArray(client.programs) ? client.programs[0] : client.programs;
  const trainingType = "online" as const;

  if (sessionModeOpen) {
    return <SessionMode clientId={client.id} onClose={() => setSessionModeOpen(false)} />;
  }

  if (liveSessionOpen) {
    return (
      <TrainerLiveSession
        clientId={client.id}
        clientName={client.name}
        programId={client.program_id}
        onClose={() => setLiveSessionOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium"
        style={{ color: "#22C55E" }}
      >
        <ChevronRight className="h-4 w-4" />
        العملاء
      </button>

      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
        >
          {client.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: trainingType === "in_person" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.2)",
                color: trainingType === "in_person" ? "#22C55E" : "#94a3b8",
              }}
            >
              {TRAINING_TYPE_LABEL_AR[trainingType]}
            </span>
            <p className="text-xs" style={{ color: "#666" }}>
              الأسبوع {client.week_number ?? 1}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl p-4" style={{ background: "#111111" }}>
        <div className="flex gap-3">
          <Target className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
              الهدف
            </p>
            <p className="text-sm text-white">{client.goal || "—"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Phone className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
              الجوال
            </p>
            <p className="text-sm text-white" dir="ltr">
              {client.phone || "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dumbbell className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
              البرنامج الحالي
            </p>
            <p className="text-sm text-white">
              {program?.name || "بدون برنامج"}
              {program?.weeks != null ? ` · ${program.weeks} أسبوع` : ""}
            </p>
          </div>
        </div>
      </div>

      <MuscleRecoveryMap clientId={client.id} />

      {trainingType === "in_person" && client.program_id && (
        <button
          type="button"
          onClick={() => setSessionModeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-[16px] font-bold text-black transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            boxShadow: "0 8px 32px rgba(34,197,94,0.35)",
          }}
        >
          <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
          وضع الجلسة الحضورية
        </button>
      )}

      <button
        type="button"
        onClick={() => setLiveSessionOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-[16px] font-bold text-white transition active:scale-95"
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Play className="h-4 w-4" strokeWidth={2.5} />
        متابعة مباشرة (مزامنة)
      </button>

      <button
        type="button"
        onClick={client.phone ? openWhatsApp : openEmail}
        disabled={!client.phone && !client.email}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, #22C55E, #16A34A)",
          boxShadow: "0 8px 24px rgba(34,197,94,0.2)",
        }}
      >
        <MessageCircle className="h-4 w-4" strokeWidth={2} />
        {client.phone ? "مراسلة واتساب" : client.email ? "إرسال بريد" : "لا يوجد تواصل"}
      </button>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-white">
          <Dumbbell className="h-4 w-4" style={{ color: "#22C55E" }} />
          آخر التمارين
        </h2>
        {lastWorkouts.length === 0 ? (
          <div className="rounded-[12px] p-4 text-center text-[14px]" style={{ background: "#111111", color: "#666" }}>
            لا توجد تمارين مكتملة بعد
          </div>
        ) : (
          <div className="space-y-2">
            {lastWorkouts.map((w) => (
              <div key={w.id} className="rounded-[12px] px-4 py-3" style={{ background: "#111111" }}>
                <p className="text-[14px] font-medium text-white">
                  {w.completed_at ? new Date(w.completed_at).toLocaleString("ar-SA", { dateStyle: "medium" }) : "—"}
                </p>
                <p className="text-[12px]" style={{ color: "#666" }}>
                  {Math.round(Number(w.total_volume) || 0)} كجم
                  {w.duration_minutes != null ? ` · ${w.duration_minutes} د` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-white">
          <CalendarDays className="h-4 w-4" style={{ color: "#22C55E" }} />
          سجل الحضور
        </h2>
        {attendanceRows.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#111111", color: "#666" }}>
            لا توجد جلسات مسجّلة بعد
          </div>
        ) : (
          <div className="space-y-2">
            {attendanceRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "#111111" }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{row.session_date}</p>
                  <p className="text-[11px]" style={{ color: "#666" }}>
                    {row.start_time?.slice(0, 5)} · {row.session_type || "جلسة"}
                  </p>
                </div>
                {row.is_completed ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#22C55E" }}>
                    <Check className="h-3.5 w-3.5" /> حضور
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "#666" }}>
                    <X className="h-3.5 w-3.5" /> لم يُسجَّل
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerMobileClientDetail;
