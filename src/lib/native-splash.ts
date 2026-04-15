import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

/**
 * Hides the native Capacitor splash after the WebView has painted the React splash
 * (call after rAF so the handoff matches #050505 → animated layer).
 */
export async function hideNativeSplashAfterPaint(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* plugin unavailable in dev / web */
  }
}
