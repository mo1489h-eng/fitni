import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ChevronRight, Phone, Target, Dumbbell, Loader2, Play } from "lucide-react";
import TrainerLiveSession from "../workout/TrainerLiveSession";
import SessionMode from "@/pages/SessionMode";
import { parseClientTrainingType, TRAINING_TYPE_LABEL_AR, type ClientTrainingType } from "@/lib/training-type";

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
          id, name, goal, phone, email, program_id, week_number, days_per_week, training_type,
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
        training_type?: string | null;
        programs: { id: string; name: string; weeks: number | null; delivery_mode?: string } | null;
      };
    },
    enabled: !!user && !!clientId,
  });

  if (isLoading || !client) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4f6f52" }} />
      </div>
    );
  }

  const program = Array.isArray(client.programs) ? client.programs[0] : client.programs;
  const trainingType: ClientTrainingType = parseClientTrainingType(client.training_type);
  const isInPerson = trainingType === "in_person";

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
        style={{ color: "#4f6f52" }}
      >
        <ChevronRight className="h-4 w-4" />
        العملاء
      </button>

      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold"
          style={{ background: "rgba(79,111,82,0.15)", color: "#4f6f52" }}
        >
          {client.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">{client.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: isInPerson ? "rgba(79,111,82,0.15)" : "rgba(100,116,139,0.2)",
                color: isInPerson ? "#4f6f52" : "#94a3b8",
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

      <div className="space-y-3 rounded-2xl bg-card p-4">
        <div className="flex gap-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4f6f52" }} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#666" }}>
              الهدف
            </p>
            <p className="text-sm text-white">{client.goal || "—"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4f6f52" }} />
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
          <Dumbbell className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4f6f52" }} />
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

      {client.program_id && isInPerson && (
        <button
          type="button"
          onClick={() => setSessionModeOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] py-4 text-[16px] font-bold text-black transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, #4f6f52, #3d5940)",
            boxShadow: "0 8px 32px rgba(79,111,82,0.35)",
          }}
        >
          <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
          وضع الجلسة الحضورية
        </button>
      )}

      {client.program_id && (
        <button
          type="button"
          onClick={() => setLiveSessionOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-card-hover py-4 text-[16px] font-bold text-foreground transition active:scale-95"
        >
          <Play className="h-4 w-4" strokeWidth={2.5} />
          متابعة مباشرة (مزامنة)
        </button>
      )}
    </div>
  );
};

export default TrainerMobileClientDetail;
