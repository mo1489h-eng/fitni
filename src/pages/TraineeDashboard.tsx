import { LayoutDashboard, CalendarDays, Dumbbell } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type TraineeClientRow = {
  id: string;
  name: string;
  portal_token: string | null;
  trainer_id: string | null;
  subscription_end_date: string;
  payment_pending: boolean;
  goal: string;
  sessions_used: number;
  sessions_per_month: number;
};

type TrainerProfile = {
  full_name: string;
  avatar_url: string | null;
  username: string | null;
};

function formatArDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function TraineeDashboard() {
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["trainee-dashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: client, error: cErr } = await supabase
        .from("clients")
        .select(
          "id, name, portal_token, trainer_id, subscription_end_date, payment_pending, goal, sessions_used, sessions_per_month",
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!client) return { client: null as TraineeClientRow | null, trainer: null as TrainerProfile | null };

      let trainer: TrainerProfile | null = null;
      if (client.trainer_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, username")
          .eq("user_id", client.trainer_id)
          .maybeSingle();
        if (prof) trainer = prof;
      }
      return { client: client as TraineeClientRow, trainer };
    },
    enabled: !!user?.id,
  });

  const client = data?.client ?? null;
  const trainer = data?.trainer ?? null;
  const payHref =
    client?.trainer_id && trainer?.username?.trim()
      ? `/pay/${trainer.username.trim()}`
      : client?.trainer_id
        ? `/coach/${client.trainer_id}`
        : null;

  /** Same experience as the native app: full portal (workouts, progress, …) lives under `/portal/*`. */
  if (!isLoading && !isError && client?.portal_token) {
    return <Navigate to={`/client-portal/${client.portal_token}`} replace />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة المتدرب</h1>
          <p className="text-sm text-muted-foreground">
            تمرينك، تقدمك، ودعم الذكاء الاصطناعي — في مكان واحد.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            تعذر تحميل بياناتك.{error instanceof Error ? ` ${error.message}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && !client && (
        <Card>
          <CardHeader>
            <CardTitle>لم نجد ملفك كمتدرب</CardTitle>
            <CardDescription>
              حسابك مسجّل، لكن لا يوجد ربط بملف متدرب. إذا كان لديك رابط من مدربك، افتحه أو سجّل الدخول من صفحة
              المتدرب.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/client-login">الذهاب إلى تسجيل دخول المتدرب</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && client && !client.portal_token && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">أهلاً، {client.name}</CardTitle>
              <CardDescription>ملخص اشتراكك. لا يوجد رمز بوابة بعد — تواصل مع مدربك لتفعيل وصولك للتمارين على الويب.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainer && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <Avatar className="h-11 w-11">
                    {trainer.avatar_url ? (
                      <AvatarImage src={trainer.avatar_url} alt="" />
                    ) : (
                      <AvatarFallback className="text-sm font-medium">
                        {trainer.full_name.slice(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">مدربك</p>
                    <p className="truncate text-sm text-muted-foreground">{trainer.full_name}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">نهاية الاشتراك</p>
                    <p className="text-sm font-medium">{formatArDate(client.subscription_end_date)}</p>
                  </div>
                </div>
                {client.sessions_per_month > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">الجلسات هذا الشهر</p>
                      <p className="text-sm font-medium">
                        {client.sessions_used} / {client.sessions_per_month}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {client.goal?.trim() && (
                <div className="rounded-lg border border-dashed border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">هدفك</p>
                  <p className="text-sm">{client.goal}</p>
                </div>
              )}

              {client.payment_pending && payHref && (
                <Alert>
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>الدفع معلّق — أكمله للاستفادة الكاملة.</span>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link to={payHref}>إتمام الدفع</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
