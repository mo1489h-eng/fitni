import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SessionMode from "@/pages/SessionMode";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseClientTrainingType, TRAINING_TYPE_LABEL_AR } from "@/lib/training-type";
import { TRAINER_HOME } from "@/lib/app-routes";

/**
 * Deep link: /trainer/session?clientId=… — coach-only; allowed only for in_person clients.
 */
export default function TrainerSessionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientId = searchParams.get("clientId")?.trim() || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["trainer-session-route-gate", clientId, user?.id],
    queryFn: async () => {
      if (!user || !clientId) return null;
      const { data: row, error: e } = await supabase
        .from("clients")
        .select("id, trainer_id")
        .eq("id", clientId)
        .eq("trainer_id", user.id)
        .maybeSingle();
      if (e) throw e;
      return row as unknown as { id: string; training_type?: string; trainer_id: string | null } | null;
    },
    enabled: !!user && !!clientId,
  });

  const onClose = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(TRAINER_HOME);
  };

  if (!clientId) {
    return <Navigate to="/clients" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background" dir="rtl">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري التحقق من صلاحية الجلسة…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6" dir="rtl">
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden />
        <p className="text-center text-sm text-muted-foreground">لم يُعثر على العميل أو لا تملك صلاحية الوصول.</p>
        <Button variant="outline" onClick={onClose}>
          رجوع
        </Button>
      </div>
    );
  }

  const tt = parseClientTrainingType(data.training_type);
  if (tt !== "in_person") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6" dir="rtl">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" aria-hidden />
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-lg font-semibold">وضع الجلسة غير متاح</h1>
          <p className="text-sm text-muted-foreground">
            هذا الرابط مخصص للتدريب الحضوري فقط. العميل معيّن كـ{" "}
            <span className="font-medium text-foreground">{TRAINING_TYPE_LABEL_AR[tt]}</span>.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          رجوع
        </Button>
      </div>
    );
  }

  return <SessionMode clientId={clientId} onClose={onClose} />;
}
