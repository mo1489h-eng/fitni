import { useState, useEffect } from "react";

const STORAGE_KEY = "portal_token";

/**
 * Portal token stored by MobileLogin after client auth (same key as web portal).
 */
export function useMobilePortalToken(): string | null {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
  useEffect(() => {
    setToken(sessionStorage.getItem(STORAGE_KEY));
  }, []);
  return token;
}
