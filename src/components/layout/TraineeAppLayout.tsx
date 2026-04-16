import { Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "./PageWrapper";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Minimal shell for trainee web routes (performance hub). */
export function TraineeAppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const { data: pendingPay } = useQuery({
    queryKey: ["trainee-payment-pending", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: row } = await supabase
        .from("clients")
        .select("id, trainer_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!row) return null;
      const { data: coach } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", row.trainer_id)
        .maybeSingle();
      const slug = coach?.username?.trim();
      return { href: slug ? `/pay/${slug}` : `/coach/${row.trainer_id}` };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border px-4 py-3 space-y-3">
        <p className="text-sm font-semibold text-foreground">مساحة المتدرب</p>
        {pendingPay && (
          <Alert>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>اشتراكك غير مكتمل — أكمل الدفع للوصول الكامل.</span>
              <Link to={pendingPay.href} className="text-primary font-medium underline underline-offset-2 shrink-0">
                إتمام الدفع
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <PageWrapper key={location.pathname}>
          <Outlet />
        </PageWrapper>
      </AnimatePresence>
    </div>
  );
}
