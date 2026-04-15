import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import * as Sentry from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveFitniRole, persistFitniRole, clearStoredFitniRole } from "@/lib/auth-service";
import { useWorkoutStore } from "@/store/workout-store";

interface Profile {
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
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const profileSelectBase =
  "full_name, created_at, subscription_plan, subscribed_at, subscription_end_date, logo_url, phone, specialization, bio, avatar_url, notify_inactive, notify_payments, notify_weekly_report, brand_color, welcome_message, onboarding_completed, username, is_founder, founder_discount_used" as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const queryClient = useQueryClient();
  const profileFetchRef = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const fetchId = ++profileFetchRef.current;
    setProfileLoading(true);
    console.log("[Auth] fetchProfile start", userId);

    try {
      let { data, error } = await supabase
        .from("profiles")
        .select(profileSelectBase)
        .eq("user_id", userId)
        .maybeSingle();

      // Stale check
      if (fetchId !== profileFetchRef.current) return;

      if (error) {
        console.error("[Auth] fetchProfile query error", error);
        setProfile(null);
      } else if (data) {
        console.log("[Auth] profile found");
        setProfile(data as Profile);
      } else {
        // No profile — try to create one via RPC
        console.log("[Auth] no profile found, calling ensure_trainer_profile");
        const { error: ensureErr } = await supabase.rpc("ensure_trainer_profile" as any);
        if (fetchId !== profileFetchRef.current) return;

        if (ensureErr) {
          console.error("[Auth] ensure_trainer_profile failed", ensureErr);
          setProfile(null);
        } else {
          const r2 = await supabase
            .from("profiles")
            .select(profileSelectBase)
            .eq("user_id", userId)
            .maybeSingle();
          if (fetchId !== profileFetchRef.current) return;
          if (r2.data) setProfile(r2.data as Profile);
          else setProfile(null);
        }
      }

      // Resolve role
      const r = await resolveFitniRole(userId);
      if (fetchId !== profileFetchRef.current) return;

      console.log("[Auth] resolved role:", r);
      if (r) {
        useWorkoutStore.getState().setFitniRole(r);
        persistFitniRole(r);
      } else {
        useWorkoutStore.getState().clearFitniRole();
      }
    } catch (e) {
      console.error("[Auth] fetchProfile error", e);
      if (fetchId === profileFetchRef.current) {
        setProfile(null);
        useWorkoutStore.getState().clearFitniRole();
      }
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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      console.log("[Auth] onAuthStateChange event:", _event);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        Sentry.setUser({ id: nextSession.user.id, email: nextSession.user.email });
        // Fire and forget — don't await inside callback to avoid deadlocks
        fetchProfile(nextSession.user.id);
      } else {
        Sentry.setUser(null);
        setProfile(null);
        setProfileLoading(false);
        useWorkoutStore.getState().clearFitniRole();
        clearStoredFitniRole();
      }
    });

    // 2. Restore initial session (after listener is registered)
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!mounted) return;
      if (import.meta.env.DEV) {
        console.log("[auth] getSession (app load)", {
          hasSession: !!initial,
          userId: initial?.user?.id,
          emailConfirmed: !!(initial?.user?.email_confirmed_at || initial?.user?.confirmed_at),
        });
      }
      setSession(initial);
      setUser(initial?.user ?? null);
      if (initial?.user) {
        Sentry.setUser({ id: initial.user.id, email: initial.user.email });
        fetchProfile(initial.user.id);
      } else {
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    Sentry.setUser(null);
    queryClient.clear();
    useWorkoutStore.getState().clearFitniRole();
    clearStoredFitniRole();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, profileLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
