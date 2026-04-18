import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { normalizeFitniRole } from "@/lib/auth-service";
import { authLogDev } from "@/lib/auth-log";

const PROFILE_FETCH_MAX_ATTEMPTS = 3;

function delayMs(): number {
  return 200 + Math.floor(Math.random() * 301);
}

/**
 * Authenticated shell: session (via AuthGuard) + profile row + valid `profiles.role`.
 * Race-safe: retries profile fetch up to 3 times with 200–500ms between attempts.
 */
export function AuthAppGate({ children }: { children: React.ReactNode }) {
  const { user, profile, profileLoading, loading, signOut, refreshProfile } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const enteredLogged = useRef(false);
  const roleLogged = useRef<string | null>(null);
  const missingFailLogged = useRef(false);
  const invalidFailLogged = useRef(false);

  useEffect(() => {
    if (!user || loading) return;
    if (!enteredLogged.current) {
      enteredLogged.current = true;
      authLogDev("auth_gate_enter", { userId: user.id });
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user || loading) return;
    if (profile) {
      setAttempt(0);
      return;
    }
    if (profileLoading) return;
    if (attempt >= PROFILE_FETCH_MAX_ATTEMPTS) return;

    const wait = delayMs();
    authLogDev("profile_fetch_attempt", {
      attempt: attempt + 1,
      max: PROFILE_FETCH_MAX_ATTEMPTS,
      waitMs: wait,
    });

    const id = window.setTimeout(() => {
      void refreshProfile().then(() => setAttempt((a) => a + 1));
    }, wait);

    return () => window.clearTimeout(id);
  }, [user, loading, profile, profileLoading, attempt, refreshProfile]);

  const role = normalizeFitniRole(profile?.role);
  useEffect(() => {
    if (!role) return;
    if (roleLogged.current === role) return;
    roleLogged.current = role;
    authLogDev("role_resolved", { source: "profiles.role", role });
  }, [role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    if (attempt < PROFILE_FETCH_MAX_ATTEMPTS) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4" dir="rtl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground">جاري مزامنة ملف الحساب…</p>
        </div>
      );
    }

    if (!missingFailLogged.current) {
      missingFailLogged.current = true;
      authLogDev("failure_reason", { reason: "profile_missing_after_retries", attempts: PROFILE_FETCH_MAX_ATTEMPTS });
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6" dir="rtl">
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden />
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-semibold">تعذّر تحميل ملف الحساب</h1>
          <p className="text-sm text-muted-foreground">
            لم يُعثر على ملف مستخدم بعد عدة محاولات. سجّل الخروج ثم أعد تسجيل الدخول، أو تواصل مع الدعم.
          </p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  if (!role) {
    if (!invalidFailLogged.current) {
      invalidFailLogged.current = true;
      authLogDev("failure_reason", { reason: "role_invalid", rawRole: profile?.role });
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6" dir="rtl">
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden />
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-semibold">صلاحية الحساب غير صالحة</h1>
          <p className="text-sm text-muted-foreground">
            بيانات دور الحساب تالفة أو غير معروفة. سجّل الخروج ثم حاول مرة أخرى أو تواصل مع الدعم.
          </p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
