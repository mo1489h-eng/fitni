import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Radio, Heart, ClipboardCheck } from "lucide-react";
import { CB } from "./designTokens";

type Props = {
  clientId: string;
  clientName: string;
  programId: string | null;
  onClose: () => void;
};

export default function TrainerLiveSession({ clientId, clientName, programId, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  const { data: session } = useQuery({
    queryKey: ["trainer-live-session", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("workout_sessions")
        .select("id, current_exercise_index, total_volume, total_sets, is_active, started_at, program_day_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; current_exercise_index: number; total_volume: number; total_sets: number; is_active: boolean; started_at: string; program_day_id: string } | null;
    },
    refetchInterval: 5000,
    enabled: !!clientId,
  });

  const { data: exerciseTotal = 1 } = useQuery({
    queryKey: ["trainer-program-day-ex-count", programId, session?.program_day_id],
    queryFn: async () => {
      if (!session?.program_day_id) return 1;
      const { count, error } = await supabase
        .from("program_exercises")
        .select("*", { count: "exact", head: true })
        .eq("day_id", session.program_day_id);
      if (error) return 1;
      return Math.max(1, count ?? 1);
    },
    enabled: !!session?.program_day_id,
  });

  const { data: exerciseName = "—" } = useQuery({
    queryKey: ["trainer-live-ex-name", session?.program_day_id, session?.current_exercise_index],
    queryFn: async () => {
      if (!session?.program_day_id) return "—";
      const { data: rows } = await supabase
        .from("program_exercises")
        .select("name, exercise_order")
        .eq("day_id", session.program_day_id)
        .order("exercise_order", { ascending: true });
      const list = rows || [];
      const idx = session.current_exercise_index ?? 0;
      return list[idx]?.name ?? list[0]?.name ?? "—";
    },
    enabled: !!session?.program_day_id,
  });

  useEffect(() => {
    if (!clientId) return;
    const ch = supabase
      .channel(`trainer-ws-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workout_sessions", filter: `client_id=eq.${clientId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["trainer-live-session", clientId] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [clientId, qc]);

  const progressPct = useMemo(() => {
    if (!session) return 0;
    const cur = (session.current_exercise_index ?? 0) + 1;
    return Math.min(100, Math.round((cur / exerciseTotal) * 100));
  }, [session, exerciseTotal]);

  const encourageMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("no user");
      await supabase.from("client_notifications").insert({
        client_id: clientId,
        title: "تشجيع من مدربك 💪",
        body: "أنت تبلي بلاءً ممتازاً — أكمل بقوة!",
        type: "encouragement",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-notifications"] }),
  });

  const attendanceMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const today = new Date().toISOString().slice(0, 10);
      const { data: rows } = await supabase
        .from("trainer_sessions")
        .select("id")
        .eq("client_id", clientId)
        .eq("trainer_id", user.id)
        .eq("session_date", today)
        .limit(1);
      const id = rows?.[0]?.id;
      if (id) {
        await supabase
          .from("trainer_sessions")
          .update({ is_completed: true, confirmation_status: "confirmed" })
          .eq("id", id);
      }
    },
  });

  const saveNotesMut = useMutation({
    mutationFn: async () => {
      if (!session?.id || !notes.trim()) return;
      await supabase.from("workout_sessions").update({ notes: notes.trim() }).eq("id", session.id);
    },
  });

  return (
    <div className="fixed inset-0 z-[130] flex flex-col" style={{ background: CB.bg }} dir="rtl">
      <header
        className="flex items-center justify-between px-4 py-3 pt-[max(8px,env(safe-area-inset-top))]"
        style={{ boxShadow: CB.shadow }}
      >
        <button type="button" onClick={onClose} className="rounded-[12px] p-2 transition active:scale-95" style={{ background: CB.card2 }}>
          <X className="h-5 w-5 text-white" />
        </button>
        <span className="text-[16px] font-bold text-white">جلسة مباشرة</span>
        <span className="w-10" />
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8">
        <div className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]" style={{ background: CB.card2 }}>
          <Radio className="h-4 w-4 animate-pulse" style={{ color: CB.accent }} />
          <span style={{ color: CB.muted }}>المتدرب: {clientName}</span>
        </div>

        {!session?.is_active ? (
          <div className="rounded-[16px] p-6 text-center text-[16px]" style={{ background: CB.card }}>
            <p className="text-white">لا توجد جلسة نشطة حالياً</p>
            <p className="mt-2 text-[12px]" style={{ color: CB.muted }}>
              اطلب من المتدرب بدء التمرين من تطبيقه
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-1 text-[12px]" style={{ color: CB.muted }}>
                التمرين الحالي
              </p>
              <p className="text-[24px] font-bold text-white">{exerciseName}</p>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-[12px]" style={{ color: CB.muted }}>
                <span>التقدم</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "#1a1a1a" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: CB.gradient }} />
              </div>
              <p className="mt-2 text-[12px]" style={{ color: CB.muted }}>
                الحجم: {Math.round(Number(session.total_volume) || 0)} كجم · مجموعات: {session.total_sets ?? 0}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => encourageMut.mutate()}
                disabled={encourageMut.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-bold text-black transition active:scale-95 disabled:opacity-50"
                style={{ background: CB.gradient }}
              >
                <Heart className="h-4 w-4" />
                إرسال تشجيع
              </button>
              <button
                type="button"
                onClick={() => attendanceMut.mutate()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border py-3 text-[14px] font-bold text-white transition active:scale-95"
                style={{ borderColor: "rgba(255,255,255,0.12)", background: CB.card }}
              >
                <ClipboardCheck className="h-4 w-4" />
                تسجيل حضور
              </button>
            </div>

            <div>
              <label className="mb-2 block text-[12px]" style={{ color: CB.muted }}>
                ملاحظات الجلسة
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-[12px] border-0 px-4 py-3 text-[16px] text-white outline-none"
                style={{ background: CB.card2 }}
                placeholder="ملاحظات للمتدرب…"
              />
              <button
                type="button"
                onClick={() => saveNotesMut.mutate()}
                className="mt-2 rounded-[12px] px-4 py-2 text-[14px] font-bold text-black transition active:scale-95"
                style={{ background: CB.accent }}
              >
                حفظ الملاحظات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
