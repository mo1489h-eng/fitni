import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFitniRole, resolveFitniRole } from "@/lib/auth-service";
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
  /** Fitni: coach | trainee (see profiles.role) */
  role?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const profileSelectBase =
    "full_name, created_at, subscription_plan, subscribed_at, subscription_end_date, logo_url, phone, specialization, bio, avatar_url, notify_inactive, notify_payments, notify_weekly_report, brand_color, welcome_message, onboarding_completed, username, is_founder, founder_discount_used" as const;

  const fetchProfile = useCallback(async (userId: string) => {
    let { data, error } = await supabase.from("profiles").select(`${profileSelectBase}, role`).eq("user_id", userId).maybeSingle();

    if (error && /role|column/i.test(String(error.message))) {
      const retry = await supabase.from("profiles").select(profileSelectBase).eq("user_id", userId).maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("fetchProfile", error);
      setProfile(null);
    } else if (data) {
      setProfile(data as Profile);
      const fromColumn = normalizeFitniRole((data as Profile).role);
      if (fromColumn) useWorkoutStore.getState().setFitniRole(fromColumn);
    } else {
      const { error: ensureErr } = await supabase.rpc("ensure_trainer_profile" as any);
      if (ensureErr) {
        console.error("ensure_trainer_profile", ensureErr);
        setProfile(null);
      } else {
        let r2 = await supabase.from("profiles").select(`${profileSelectBase}, role`).eq("user_id", userId).maybeSingle();
        if (r2.error && /role|column/i.test(String(r2.error.message))) {
          r2 = await supabase.from("profiles").select(profileSelectBase).eq("user_id", userId).maybeSingle();
        }
        if (r2.data) setProfile(r2.data as Profile);
        else setProfile(null);
      }
    }

    try {
      const r = await resolveFitniRole(userId);
      if (r) useWorkoutStore.getState().setFitniRole(r);
      else useWorkoutStore.getState().clearFitniRole();
    } catch (e) {
      console.error("resolveFitniRole", e);
      useWorkoutStore.getState().clearFitniRole();
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        Sentry.setUser({ id: nextSession.user.id, email: nextSession.user.email });
        await fetchProfile(nextSession.user.id);
      } else {
        Sentry.setUser(null);
        setProfile(null);
        useWorkoutStore.getState().clearFitniRole();
      }
    });

    void (async () => {
      const {
        data: { session: initial },
      } = await supabase.auth.getSession();
      setSession(initial);
      setUser(initial?.user ?? null);
      if (initial?.user) {
        Sentry.setUser({ id: initial.user.id, email: initial.user.email });
        await fetchProfile(initial.user.id);
      }
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    Sentry.setUser(null);
    queryClient.clear();
    useWorkoutStore.getState().clearFitniRole();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
