import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { COACH_DASHBOARD, TRAINEE_HOME } from "@/lib/app-routes";
import type { FitniRole } from "@/lib/auth-service";

const FLOW3_REFRESH_FLAG = "fitni-auth-test-post-refresh";

type FlowResult = {
  status: "idle" | "pass" | "fail";
  detail?: string;
  raw?: string;
  redirect?: string;
};

const emptyResult = (): FlowResult => ({ status: "idle" });

function formatSupabaseError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "object" && err !== null && "message" in err) {
    const o = err as Record<string, unknown>;
    return JSON.stringify({
      message: o.message,
      code: o.code,
      details: o.details,
      hint: o.hint,
      status: o.status,
    });
  }
  return String(err);
}

function AuthTestChecklistInner() {
  const navigate = useNavigate();
  const { user, profile, resolvedFitniRole, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();

  const [flow1, setFlow1] = useState<FlowResult>(() => emptyResult());
  const [flow2, setFlow2] = useState<FlowResult>(() => emptyResult());
  const [flow3, setFlow3] = useState<FlowResult>(() => emptyResult());
  const [flow4, setFlow4] = useState<FlowResult>(() => emptyResult());

  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPassword, setCoachPassword] = useState("");
  const [traineeName, setTraineeName] = useState("");
  const [traineeEmail, setTraineeEmail] = useState("");
  const [traineePassword, setTraineePassword] = useState("");
  const [flow1Busy, setFlow1Busy] = useState(false);
  const [flow2Busy, setFlow2Busy] = useState(false);

  const [lastEmail, setLastEmail] = useState("");
  const [lastPassword, setLastPassword] = useState("");
  const [flow4LoggedOut, setFlow4LoggedOut] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [flow4Busy, setFlow4Busy] = useState(false);

  const displayRole = profile?.role ?? resolvedFitniRole ?? "—";

  const runSignUp = async (
    name: string,
    email: string,
    password: string,
    role: FitniRole,
    setBusy: (v: boolean) => void,
    setFlow: (r: FlowResult) => void
  ) => {
    setFlow(emptyResult());
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm || password.length < 8) {
      setFlow({
        status: "fail",
        detail: "Email required; password min 8 characters.",
        raw: "",
      });
      return;
    }

    setBusy(true);
    try {
      const isTrainee = role === "trainee";
      const postAuthPath = isTrainee ? TRAINEE_HOME : COACH_DASHBOARD;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: {
          data: {
            full_name: name.trim(),
            role,
            is_client: isTrainee,
          },
          emailRedirectTo: `${getAuthSiteOrigin()}${postAuthPath}`,
        },
      });

      if (error) {
        setFlow({
          status: "fail",
          detail: error.message ?? "signUp failed",
          raw: formatSupabaseError(error),
        });
        return;
      }

      if (!signUpData?.user) {
        setFlow({ status: "fail", detail: "No user returned from signUp", raw: "" });
        return;
      }

      if (!signUpData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password,
        });
        if (signInErr) {
          setFlow({
            status: "fail",
            detail: signInErr.message ?? "signIn after signUp failed",
            raw: formatSupabaseError(signInErr),
          });
          return;
        }
      }

      setLastEmail(emailNorm);
      setLastPassword(password);
      setFlow({
        status: "pass",
        detail: `Signed up as ${role}; navigating to ${postAuthPath}`,
        redirect: postAuthPath,
        raw: "",
      });
      navigate(postAuthPath, { replace: true });
    } catch (e) {
      setFlow({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        raw: formatSupabaseError(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const checkSession = useCallback(() => {
    if (authLoading) {
      setFlow3({ status: "idle", detail: "Auth still loading…" });
      return;
    }
    if (user?.email) {
      setFlow3({
        status: "pass",
        detail: `Logged in as ${user.email} — profiles.role: ${profile?.role ?? "null"}, resolvedFitniRole: ${resolvedFitniRole ?? "null"}`,
        raw: "",
      });
    } else {
      setFlow3({
        status: "fail",
        detail: "No active session",
        raw: "",
      });
    }
  }, [authLoading, user, profile?.role, resolvedFitniRole]);

  useEffect(() => {
    if (sessionStorage.getItem(FLOW3_REFRESH_FLAG) !== "1") return;
    if (authLoading) return;
    sessionStorage.removeItem(FLOW3_REFRESH_FLAG);
    if (user?.email) {
      setFlow3({
        status: "pass",
        detail: `After hard refresh: still logged in as ${user.email} — role ${displayRole}`,
        raw: "",
      });
    } else {
      setFlow3({
        status: "fail",
        detail: "After hard refresh: no session",
        raw: "",
      });
    }
  }, [authLoading, user, displayRole]);

  const hardRefresh = () => {
    sessionStorage.setItem(FLOW3_REFRESH_FLAG, "1");
    window.location.reload();
  };

  const handleLogout = async () => {
    setFlow4(emptyResult());
    try {
      await signOut();
      setFlow4LoggedOut(true);
      setLoginEmail(lastEmail);
      setLoginPassword(lastPassword);
      setFlow4({
        status: "pass",
        detail: "Logout completed; use login form below.",
        raw: "",
      });
    } catch (e) {
      setFlow4({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        raw: formatSupabaseError(e),
      });
    }
  };

  const handleLogin = async () => {
    setFlow4Busy(true);
    setFlow4(emptyResult());
    const emailNorm = loginEmail.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: loginPassword,
      });
      if (error) {
        setFlow4({
          status: "fail",
          detail: error.message ?? "signIn failed",
          raw: formatSupabaseError(error),
        });
        return;
      }
      if (!data.session) {
        setFlow4({ status: "fail", detail: "No session after signIn", raw: "" });
        return;
      }
      const roleAfter = await refreshProfile();
      setFlow4LoggedOut(false);
      setFlow4({
        status: "pass",
        detail: `Logged in as ${emailNorm}; role resolved: ${roleAfter ?? profile?.role ?? "—"}`,
        raw: "",
      });
    } catch (e) {
      setFlow4({
        status: "fail",
        detail: e instanceof Error ? e.message : String(e),
        raw: formatSupabaseError(e),
      });
    } finally {
      setFlow4Busy(false);
    }
  };

  const ResultLine = ({ result }: { result: FlowResult }) => (
    <div className="mt-3 space-y-1 text-sm">
      {result.status === "idle" && <p className="text-muted-foreground">No result yet.</p>}
      {result.status === "pass" && (
        <p className="flex items-start gap-2 text-primary">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{result.detail ?? "PASS"}</span>
        </p>
      )}
      {result.status === "fail" && (
        <p className="flex items-start gap-2 text-destructive">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>
            {result.detail ?? "FAIL"}
            {result.raw ? (
              <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted p-2 text-xs text-foreground">{result.raw}</pre>
            ) : null}
          </span>
        </p>
      )}
      {result.redirect ? (
        <p className="text-muted-foreground text-xs">Redirect: {result.redirect}</p>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 md:p-10" dir="ltr">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Auth test checklist (dev only)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <code className="rounded bg-muted px-1">/auth-test</code> — raw Supabase errors below. Does not change production auth code.
          </p>
        </header>

        <section className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-medium">FLOW 1 — Coach signup</h2>
          <div className="grid gap-3 sm:grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-coach-name">Name</Label>
              <Input id="auth-test-coach-name" value={coachName} onChange={(e) => setCoachName(e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-coach-email">Email</Label>
              <Input id="auth-test-coach-email" type="email" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-coach-password">Password</Label>
              <Input
                id="auth-test-coach-password"
                type="password"
                value={coachPassword}
                onChange={(e) => setCoachPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={flow1Busy}
            onClick={() => void runSignUp(coachName, coachEmail, coachPassword, "coach", setFlow1Busy, setFlow1)}
          >
            {flow1Busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign up as Coach
          </Button>
          <ResultLine result={flow1} />
        </section>

        <section className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-medium">FLOW 2 — Trainee signup</h2>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-trainee-name">Name</Label>
              <Input id="auth-test-trainee-name" value={traineeName} onChange={(e) => setTraineeName(e.target.value)} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-trainee-email">Email</Label>
              <Input id="auth-test-trainee-email" type="email" value={traineeEmail} onChange={(e) => setTraineeEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-test-trainee-password">Password</Label>
              <Input
                id="auth-test-trainee-password"
                type="password"
                value={traineePassword}
                onChange={(e) => setTraineePassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            type="button"
            disabled={flow2Busy}
            onClick={() => void runSignUp(traineeName, traineeEmail, traineePassword, "trainee", setFlow2Busy, setFlow2)}
          >
            {flow2Busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign up as Trainee
          </Button>
          <ResultLine result={flow2} />
        </section>

        <section className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-medium">FLOW 3 — Session persistence</h2>
          <p className="text-sm text-muted-foreground">
            Current: {authLoading || profileLoading ? "loading…" : user ? `${user.email} — role ${displayRole}` : "not logged in"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={checkSession}>
              Check current session
            </Button>
            <Button type="button" variant="outline" onClick={hardRefresh}>
              Hard refresh test
            </Button>
            <Button type="button" variant="ghost" asChild>
              <a href="/auth-test">Re-open this page</a>
            </Button>
          </div>
          <ResultLine result={flow3} />
        </section>

        <section className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-medium">FLOW 4 — Logout / login</h2>
          <p className="text-sm text-muted-foreground">
            Last signup credentials stored: {lastEmail || "—"} (password kept in memory for this page only)
          </p>
          <Button type="button" variant="destructive" onClick={() => void handleLogout()}>
            Logout
          </Button>
          {flow4LoggedOut || !user ? (
            <div className="mt-4 space-y-3 rounded-md border border-dashed border-border p-4">
              <p className="text-sm font-medium">Login</p>
              <div className="space-y-1.5">
                <Label htmlFor="auth-test-login-email">Email</Label>
                <Input id="auth-test-login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="username" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-test-login-password">Password</Label>
                <Input
                  id="auth-test-login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="button" disabled={flow4Busy} onClick={() => void handleLogin()}>
                {flow4Busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Log in
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Log out first to show the login form.</p>
          )}
          <ResultLine result={flow4} />
        </section>
      </div>
    </div>
  );
}

export default function AuthTestChecklist() {
  if (!import.meta.env.DEV) return null;
  return <AuthTestChecklistInner />;
}
