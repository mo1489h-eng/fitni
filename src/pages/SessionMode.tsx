import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgramRealtimeSync } from "@/hooks/useProgramRealtimeSync";
import TrainerWorkoutSession from "@/components/mobile/trainer/TrainerWorkoutSession";
import { Loader2 } from "lucide-react";

type Props = {
  clientId: string;
  onClose: () => void;
};

/**
 * In-person session shell: full workout UI only when the assigned program is `delivery_mode === "in_person"`.
 * Online programs use the standard client workout flow without this trainer-led session surface.
 */
export default function SessionMode({ clientId, onClose }: Props) {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["session-mode-gate", clientId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: row, error: e } = await supabase
        .from("clients")
        .select(
          `
          id,
          program_id,
          programs ( id, name, delivery_mode )
        `
        )
        .eq("id", clientId)
        .eq("trainer_id", user.id)
        .maybeSingle();
      if (e) throw e;
      const prog = row?.programs as { id: string; name: string; delivery_mode?: string } | null;
      return {
        programId: row?.program_id ?? null,
        deliveryMode: prog?.delivery_mode === "in_person" ? "in_person" as const : "online" as const,
        programName: prog?.name ?? "",
      };
    },
    enabled: !!user && !!clientId,
  });

  useProgramRealtimeSync(data?.programId ?? null);

  if (isLoading || !data) {
    return (
      <div
        className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-3"
        style={{ background: "#050505" }}
        dir="rtl"
      >
        <Loader2 className="h-9 w-9 animate-spin" style={{ color: "#22C55E" }} />
        <p className="text-sm text-white/60">جاري تجهيز وضع الجلسة…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#050505" }} dir="rtl">
        <p className="text-center text-sm text-white">تعذّر تحميل البيانات</p>
        <button type="button" onClick={onClose} className="rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: "#222" }}>
          إغلاق
        </button>
      </div>
    );
  }

  if (!data.programId) {
    return (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#050505" }} dir="rtl">
        <p className="text-center text-sm text-white/90">لا يوجد برنامج معيّن لهذا العميل</p>
        <button type="button" onClick={onClose} className="rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: "#222" }}>
          إغلاق
        </button>
      </div>
    );
  }

  if (data.deliveryMode !== "in_person") {
    return (
      <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 px-6" style={{ background: "#050505" }} dir="rtl">
        <p className="text-center text-sm leading-relaxed text-white/85">
          وضع الجلسة الحضورية متاح فقط للبرامج المعرّفة كـ <span className="text-[#22C55E] font-semibold">حضوري</span>.
          <br />
          <span className="text-white/55 text-xs mt-2 block">غيّر نوع التسليم في إعدادات البرنامج إلى حضوري لتفعيل هذه الشاشة.</span>
        </p>
        <button type="button" onClick={onClose} className="rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: "#222" }}>
          إغلاق
        </button>
      </div>
    );
  }

  return <TrainerWorkoutSession clientId={clientId} programId={data.programId} onClose={onClose} />;
}
