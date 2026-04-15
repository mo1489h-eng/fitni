import { useEffect, useMemo, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workout-store";
import { normalizeFitniRole, readStoredFitniRole, type FitniRole } from "@/lib/auth-service";
import { CLIENT_HOME, TRAINER_HOME } from "@/lib/app-routes";

type Props = {
  allowed: FitniRole;
  children: React.ReactNode;
};

/**
 * Blocks wrong-role access to coach vs trainee areas.
 * Waits for both auth session AND profile/role resolution before deciding.
 */
export function RoleGuard({ allowed, children }: Props) {
  const { loading, profileLoading, user, refreshProfile } = useAuth();
  const fitniRole = useWorkoutStore((s) => s.fitniRole);
  const roleRetryRef = useRef(0);

  useEffect(() => {
    if (!user || profileLoading) return;
    const live = normalizeFitniRole(fitniRole) ?? readStoredFitniRole();
    if (live || roleRetryRef.current >= 3) return;
    roleRetryRef.current += 1;
    if (import.meta.env.DEV) console.log("[Auth] RoleGuard: role empty — refreshProfile retry", roleRetryRef.current);
    void refreshProfile();
  }, [user, profileLoading, fitniRole, refreshProfile]);

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

  // Session exists but role still null after profile fetch — avoid /login loop; keep resolving (ensure_trainer_profile + resolveFitniRole).
  if (!effectiveRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-center text-sm text-muted-foreground">جاري تجهيز صلاحيات حسابك…</p>
      </div>
    );
  }

  // Wrong role → redirect to correct area
  if (effectiveRole !== allowed) {
    return <Navigate to={effectiveRole === "coach" ? TRAINER_HOME : CLIENT_HOME} replace />;
  }

  return <>{children}</>;
}
