import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workout-store";
import type { FitniRole } from "@/lib/auth-service";

type Props = {
  allowed: FitniRole;
  children: React.ReactNode;
};

/**
 * Blocks wrong-role access to coach vs trainee areas.
 * Uses `fitniRole` from store (hydrated from localStorage + synced from Supabase).
 */
export function RoleGuard({ allowed, children }: Props) {
  const { loading, user } = useAuth();
  const fitniRole = useWorkoutStore((s) => s.fitniRole);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!fitniRole) {
    return <Navigate to="/login" replace />;
  }

  if (fitniRole !== allowed) {
    return <Navigate to={fitniRole === "coach" ? "/dashboard" : "/trainee/dashboard"} replace />;
  }

  return <>{children}</>;
}
