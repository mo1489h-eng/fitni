import "./lib/supabaseLegacyCleanup";
import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://26b81046c926be6f484ec8e29ec1f821@o4511169383956480.ingest.de.sentry.io/4511169399357520",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Sentry.ErrorBoundary fallback={<p>حدث خطأ غير متوقع</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </BrowserRouter>
);

/** Capgo: mark the current bundle healthy after React root is mounted (avoids auto-rollback). */
if (Capacitor.isNativePlatform()) {
  queueMicrotask(() => {
    void CapacitorUpdater.notifyAppReady().catch((err) => {
      console.warn("[Capgo] notifyAppReady failed", err);
    });
  });
}
