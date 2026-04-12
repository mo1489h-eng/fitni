import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function useIsNativePlatform() {
  const [isNative, setIsNative] = useState<boolean>(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsNative(Capacitor.isNativePlatform());
    } catch {
      setIsNative(false);
    }
  }, []);

  return isNative;
}
