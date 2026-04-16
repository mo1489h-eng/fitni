import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { normalizeFitniRole, type FitniRole } from "@/lib/auth-service";
import { CLIENT_HOME, TRAINER_HOME } from "@/lib/app-routes";

type Props = {
  allowed: FitniRole;
  children: React.ReactNode;
};

/**
 * Blocks wrong-role access to coach vs trainee areas.
 * Role comes from `profiles.role` and/or server `resolvedFitniRole` only (never localStorage).
 */
export function RoleGuard({ allowed, children }: Props) {
  const { loading, profileLoading, user, profile, resolvedFitniRole } = useAuth();

  const effectiveRole = useMemo((): FitniRole | null => {
    return normalizeFitniRole(profile?.role) ?? resolvedFitniRole;
  }, [profile?.role, resolvedFitniRole]);

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

  // Session exists but role still null after profile fetch — keep resolving (ensure_user_profile + resolveFitniRole).
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
