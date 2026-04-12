import { WorkoutSessionProvider, useWorkoutSession } from "./WorkoutSessionContext";
import FeatureErrorBoundary from "./FeatureErrorBoundary";
import WorkoutSessionScreen from "./WorkoutSessionScreen";
import RestTimerScreen from "./RestTimerScreen";
import WorkoutCompleteScreen from "./WorkoutCompleteScreen";
import { CB } from "./designTokens";

function WorkoutFlowInner() {
  const w = useWorkoutSession();

  if (w.phase === "loading" && !w.sessionId) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: CB.bg }} dir="rtl">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: CB.accent }}
        />
        <p className="mt-4 text-[12px]" style={{ color: CB.muted }}>
          جاري تجهيز التمرين…
        </p>
      </div>
    );
  }

  if (w.phase === "rest") return <RestTimerScreen />;
  if (w.phase === "complete") return <WorkoutCompleteScreen />;
  return <WorkoutSessionScreen />;
}

type Props = {
  clientId: string;
  portalToken: string;
  onClose: () => void;
};

export default function WorkoutSessionFlow({ clientId, portalToken, onClose }: Props) {
  return (
    <FeatureErrorBoundary fallbackTitle="تعذّر تحميل واجهة التمرين">
      <WorkoutSessionProvider clientId={clientId} portalToken={portalToken} onClose={onClose}>
        <WorkoutFlowInner />
      </WorkoutSessionProvider>
    </FeatureErrorBoundary>
  );
}
