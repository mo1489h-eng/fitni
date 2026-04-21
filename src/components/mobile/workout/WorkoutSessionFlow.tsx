import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { WorkoutSessionProvider, useWorkoutSession } from "./WorkoutSessionContext";
import FeatureErrorBoundary from "./FeatureErrorBoundary";
import WorkoutSessionScreenV2 from "./v2/WorkoutSessionScreenV2";
import WorkoutCompleteCelebration from "./v2/WorkoutCompleteCelebration";

/** Lock the device to portrait for the entire lifetime of the workout flow. */
function usePortraitLock() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void ScreenOrientation.lock({ orientation: "portrait" }).catch(() => {
      /* some devices (rare Android tablets) reject lock; ignore silently */
    });
    return () => {
      void ScreenOrientation.unlock().catch(() => {
        /* ignore */
      });
    };
  }, []);
}

function WorkoutFlowInner() {
  const w = useWorkoutSession();

  if (w.phase === "loading" && !w.sessionId) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: "#0a0a0a" }}
        dir="rtl"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#16a34a" }}
        />
        <p className="mt-4 text-[12px] text-white/55">جاري تجهيز التمرين…</p>
      </div>
    );
  }

  if (w.phase === "complete") return <WorkoutCompleteCelebration />;
  return <WorkoutSessionScreenV2 />;
}

type Props = {
  clientId: string;
  portalToken: string;
  onClose: () => void;
};

export default function WorkoutSessionFlow({ clientId, portalToken, onClose }: Props) {
  usePortraitLock();

  return (
    <FeatureErrorBoundary fallbackTitle="تعذّر تحميل واجهة التمرين">
      <WorkoutSessionProvider clientId={clientId} portalToken={portalToken} onClose={onClose}>
        <WorkoutFlowInner />
      </WorkoutSessionProvider>
    </FeatureErrorBoundary>
  );
}
