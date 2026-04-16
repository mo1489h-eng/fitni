import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import * as Sentry from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveFitniRole,
  clearStoredFitniRole,
  isMissingProfilesRoleColumn,
  isPostgrestMissingColumnError,
} from "@/lib/auth-service";
import type { FitniRole } from "@/lib/auth-service";
import { syncTraineePortalTokenForUser, clearTraineePortalToken } from "@/lib/trainee-portal-token";
import { useWorkoutStore } from "@/store/workout-store";

interface Profile {
  /** Server-only `profiles.role` (coach | trainee); never inferred client-side */
  role?: string | null;
  /** Trainee acquisition: landing | invite — set only by server metadata / edge */
  source?: string | null;
  /** App-level flag synced from auth when email is confirmed; used for sensitive actions */
  email_verified?: boolean | null;
  full_name: string;
  created_at: string;
  subscription_plan: string | null;
  subscribed_at: string | null;
  subscription_end_date: string | null;
  logo_url: string | null;
  phone: string;
  specialization: string;
  bio: string;
  avatar_url: string | null;
  notify_inactive: boolean;
  notify_payments: boolean;
  notify_weekly_report: boolean;
  brand_color: string;
  welcome_message: string;
  onboarding_completed: boolean;
  username: string | null;
  is_founder: boolean;
  founder_discount_used: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Server-resolved coach/trainee from `resolveFitniRole` only — never from localStorage. */
  resolvedFitniRole: FitniRole | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<FitniRole | null>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  resolvedFitniRole: null,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
  refreshProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

/** Full trainer profile row (includes `role` for Fitni routing). */
const profileSelectColumns =
  "full_name, created_at, subscription_plan, subscribed_at, subscription_end_date, logo_url, phone, specialization, bio, avatar_url, notify_inactive, notify_payments, notify_weekly_report, brand_color, welcome_message, onboarding_completed, username, is_founder, founder_discount_used, role, source, email_verified" as const;

/** Same row without `role` — used when remote DB has not run role migration yet (42703). */
const profileSelectColumnsNoRole =
  "full_name, created_at, subscription_plan, subscribed_at, subscription_end_date, logo_url, phone, specialization, bio, avatar_url, notify_inactive, notify_payments, notify_weekly_report, brand_color, welcome_message, onboarding_completed, username, is_founder, founder_discount_used, email_verified" as const;

/** Oldest-compatible row — no `role`, `source`, or `email_verified` (optional migrations not applied). */
const profileSelectColumnsLegacy =
  "full_name, created_at, subscription_plan, subscribed_at, subscription_end_date, logo_url, phone, specialization, bio, avatar_url, notify_inactive, notify_payments, notify_weekly_report, brand_color, welcome_message, onboarding_completed, username, is_founder, founder_discount_used" as const;

async function selectProfileRow(userId: string) {
  let r = await supabase
    .from("profiles")
    .select(profileSelectColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (!r.error) return r;

  const shouldTryNarrower =
    isMissingProfilesRoleColumn(r.error) || isPostgrestMissingColumnError(r.error);
  if (shouldTryNarrower) {
    r = await supabase
      .from("profiles")
      .select(profileSelectColumnsNoRole)
      .eq("user_id", userId)
      .maybeSingle();
  }

  if (!r.error) return r;
  if (isPostgrestMissingColumnError(r.error)) {
    r = await supabase
      .from("profiles")
      .select(profileSelectColumnsLegacy)
      .eq("user_id", userId)
      .maybeSingle();
  }
  return r;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resolvedFitniRole, setResolvedFitniRole] = useState<FitniRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const queryClient = useQueryClient();
  const profileFetchRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string): Promise<FitniRole | null> => {
    const fetchId = ++profileFetchRef.current;
    setProfileLoading(true);
    if (import.meta.env.DEV) console.log("[Auth] fetchProfile start", userId);

    try {
      let { data, error } = await selectProfileRow(userId);

      // Stale check
      if (fetchId !== profileFetchRef.current) return null;

      if (error) {
        console.error("[Auth] fetchProfile query error", error);
        setProfile(null);
      } else if (data) {
        if (import.meta.env.DEV) console.log("[Auth] profile found");
        setProfile(data as Profile);
      } else {
        // No profile — try to create one via RPC
        if (import.meta.env.DEV) console.log("[Auth] no profile found, calling ensure_user_profile");
        const { error: ensureErr } = await supabase.rpc("ensure_user_profile");
        if (fetchId !== profileFetchRef.current) return null;

        if (ensureErr) {
          console.error("[Auth] ensure_user_profile failed", ensureErr);
          setProfile(null);
        } else {
          const r2 = await selectProfileRow(userId);
          if (fetchId !== profileFetchRef.current) return null;
          if (r2.data) setProfile(r2.data as Profile);
          else setProfile(null);
        }
      }

      const { error: syncErr } = await supabase.rpc("sync_profile_email_verification_from_auth");
      if (syncErr && import.meta.env.DEV) {
        console.warn("[Auth] sync_profile_email_verification_from_auth", syncErr.message);
      }
      if (!syncErr) {
        const ref = await selectProfileRow(userId);
        if (fetchId !== profileFetchRef.current) return null;
        if (ref.data) setProfile(ref.data as Profile);
      }

      // Resolve role
      const r = await resolveFitniRole(userId);
      if (fetchId !== profileFetchRef.current) return null;

      if (import.meta.env.DEV) console.log("[Auth] resolved role:", r);
      if (r) {
        setResolvedFitniRole(r);
        useWorkoutStore.getState().setFitniRole(r);
        setProfile((prev) => (prev ? { ...prev, role: r } : prev));
        if (r === "trainee") {
          await syncTraineePortalTokenForUser(userId);
        }
      } else {
        setResolvedFitniRole(null);
        useWorkoutStore.getState().clearFitniRole();
      }
      return r;
    } catch (e) {
      console.error("[Auth] fetchProfile error", e);
      if (fetchId === profileFetchRef.current) {
        setProfile(null);
        setResolvedFitniRole(null);
        useWorkoutStore.getState().clearFitniRole();
      }
      return null;
    } finally {
      if (fetchId === profileFetchRef.current) {
        setProfileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Set up the listener FIRST (before getSession) to catch all events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.log("[Auth] onAuthStateChange", {
        event,
        userId: nextSession?.user?.id ?? null,
        email: nextSession?.user?.email ?? null,
      });
      // INITIAL_SESSION duplicates what getSession() already applied — skipping avoids
      // duplicate fetchProfile + race conditions on refresh.
      if (event === "INITIAL_SESSION") return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        Sentry.setUser({ id: nextSession.user.id, email: nextSession.user.email });
        void fetchProfile(nextSession.user.id);
      } else {
        Sentry.setUser(null);
        setProfile(null);
        setProfileLoading(false);
        setResolvedFitniRole(null);
        useWorkoutStore.getState().clearFitniRole();
        clearStoredFitniRole();
        clearTraineePortalToken();
      }
    });

    // 2. Restore initial session (single source of truth for first paint)
    void supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.log("[auth] getSession (app load)", {
        hasSession: !!initial,
        userId: initial?.user?.id,
        email: initial?.user?.email ?? null,
        emailConfirmed: !!initial?.user?.email_confirmed_at,
      });
      setSession(initial);
      setUser(initial?.user ?? null);
      if (initial?.user) {
        Sentry.setUser({ id: initial.user.id, email: initial.user.email });
        void fetchProfile(initial.user.id);
      } else {
        setProfileLoading(false);
      }
      setLoading(false);
      if (import.meta.env.DEV) console.log("[Auth] initial session hydrate complete", { hasUser: !!initial?.user });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async (): Promise<FitniRole | null> => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (s?.user) return await fetchProfile(s.user.id);
    return null;
  }, [fetchProfile]);

  const signOut = async () => {
    if (import.meta.env.DEV) console.log("[Auth] signOut requested");
    await supabase.auth.signOut();
    Sentry.setUser(null);
    queryClient.clear();
    useWorkoutStore.getState().clearFitniRole();
    clearStoredFitniRole();
    clearTraineePortalToken();
    setSession(null);
    setUser(null);
    setProfile(null);
    setResolvedFitniRole(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, resolvedFitniRole, loading, profileLoading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
