import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workout-store";
import { normalizeFitniRole, readStoredFitniRole, type FitniRole } from "@/lib/auth-service";

type Props = {
  allowed: FitniRole;
  children: React.ReactNode;
};

/**
 * Blocks wrong-role access to coach vs trainee areas.
 * Waits for both auth session AND profile/role resolution before deciding.
 */
export function RoleGuard({ allowed, children }: Props) {
  const { loading, profileLoading, user } = useAuth();
  const fitniRole = useWorkoutStore((s) => s.fitniRole);

  const effectiveRole = useMemo(() => {
    // First try live store role
    const live = normalizeFitniRole(fitniRole);
    if (live) return live;
    // Fallback to localStorage while profile is still loading
    return readStoredFitniRole();
  }, [fitniRole]);

  // Wait for auth session to be determined
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No user → login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User exists but role is still being resolved — wait
  if (profileLoading && !effectiveRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Role resolved but null — no profile, send to login
  if (!effectiveRole) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role → redirect to correct area
  if (effectiveRole !== allowed) {
    return <Navigate to={effectiveRole === "coach" ? "/dashboard" : "/trainee/dashboard"} replace />;
  }

  return <>{children}</>;
}
