import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "portal_token";

interface PortalTokenContextType {
  token: string | null;
}

export const PortalTokenContext = createContext<PortalTokenContextType>({ token: null });

/** `"portal"` = `/portal/*` (رابط البوابة). `"trainee"` = `/trainee/*` (مساحة المتدرب في المتصفح). */
export type PortalBase = "portal" | "trainee";

export const PortalBasePathContext = createContext<PortalBase>("portal");

export const usePortalToken = () => useContext(PortalTokenContext);

/** يبني مساراً تحت نفس قاعدة البوابة (portal أو trainee). */
export function portalPath(base: PortalBase, segment: string): string {
  const s = segment.replace(/^\//, "");
  if (base === "portal") {
    if (!s || s === "home") return "/portal";
    return `/portal/${s}`;
  }
  if (!s || s === "home") return "/trainee/home";
  return `/trainee/${s}`;
}

export function usePortalPath(): (segment: string) => string {
  const base = useContext(PortalBasePathContext);
  const resolved = base ?? "portal";
  return useCallback((segment: string) => portalPath(resolved, segment), [resolved]);
}

/**
 * بوابة العميل من رابط يحتوي التوكن: يخزّن التوكن ويحوّل إلى `/portal/*`.
 */
export const PortalTokenProvider = ({ children }: { children: ReactNode }) => {
  const { token: urlToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(() => {
    return urlToken || sessionStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (urlToken) {
      sessionStorage.setItem(STORAGE_KEY, urlToken);
      setToken(urlToken);
      const pathAfterToken = location.pathname.replace(`/client-portal/${urlToken}`, "");
      const cleanPath = `/portal${pathAfterToken || ""}`;
      navigate(cleanPath, { replace: true });
    }
  }, [urlToken, navigate, location.pathname]);

  return (
    <PortalTokenContext.Provider value={{ token }}>
      <PortalBasePathContext.Provider value="portal">{children}</PortalBasePathContext.Provider>
    </PortalTokenContext.Provider>
  );
};

/**
 * مساحة المتدرب في الويب: يحمّل `portal_token` من `clients` ويضبط نفس مفتاح التخزين كالتطبيق.
 */
export function TraineePortalTokenProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["trainee-portal-client", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: row, error } = await supabase
        .from("clients")
        .select("portal_token")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return row;
    },
    enabled: !!user?.id,
  });

  const token = useMemo(() => {
    const t = data?.portal_token?.trim();
    if (t && t.length >= 8) return t;
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, [data?.portal_token]);

  useEffect(() => {
    if (token && token.length >= 8) {
      sessionStorage.setItem(STORAGE_KEY, token);
    }
  }, [token]);

  if (isLoading && !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">لم يتم ربط ملفك كمتدرب</h1>
        <p className="text-sm text-muted-foreground">
          سجّل الدخول عبر رابط مدربك أو من صفحة المتدرب لربط حسابك ببرنامجك وتمارينك.
        </p>
        <Link to="/client-login" className="inline-block text-primary font-medium underline underline-offset-2">
          تسجيل دخول المتدرب
        </Link>
      </div>
    );
  }

  return (
    <PortalTokenContext.Provider value={{ token }}>
      <PortalBasePathContext.Provider value="trainee">{children}</PortalBasePathContext.Provider>
    </PortalTokenContext.Provider>
  );
}
