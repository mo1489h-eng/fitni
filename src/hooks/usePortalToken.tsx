import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const STORAGE_KEY = "portal_token";

interface PortalTokenContextType {
  token: string | null;
}

const PortalTokenContext = createContext<PortalTokenContextType>({ token: null });

export const usePortalToken = () => useContext(PortalTokenContext);

/**
 * Wraps portal routes. On first visit with a token in the URL,
 * stores it in sessionStorage and redirects to a clean URL.
 * Subsequent navigation reads from sessionStorage.
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
      // Store token and redirect to clean URL
      sessionStorage.setItem(STORAGE_KEY, urlToken);
      setToken(urlToken);

      // Build clean path: /client-portal/:token/workout → /portal/workout
      const pathAfterToken = location.pathname.replace(`/client-portal/${urlToken}`, "");
      const cleanPath = `/portal${pathAfterToken || ""}`;
      navigate(cleanPath, { replace: true });
    }
  }, [urlToken, navigate, location.pathname]);

  return (
    <PortalTokenContext.Provider value={{ token }}>
      {children}
    </PortalTokenContext.Provider>
  );
};
