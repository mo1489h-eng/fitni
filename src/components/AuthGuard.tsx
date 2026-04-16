import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import TrialExpiryModal from "@/components/TrialExpiryModal";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import NpsFeedbackModal from "@/components/NpsFeedbackModal";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { getTrialEndDate } from "@/lib/trial-config";

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [readOnlyDismissed, setReadOnlyDismissed] = useState(false);
  const [showNps, setShowNps] = useState(false);
  const [npsChecked, setNpsChecked] = useState(false);

  // Determine trial state
  const normalizedPlan = profile?.subscription_plan === "basic" || profile?.subscription_plan === "pro"
    ? profile.subscription_plan
    : "free";

  const isTrialExpired = (() => {
    if (!profile) return false;
    if (normalizedPlan !== "free") return false;

    const trialEndDate = getTrialEndDate(profile.created_at);
    return new Date() >= trialEndDate;
  })();

  const daysBeforeExpiry = (() => {
    if (!profile) return 999;
    const trialEndDate = getTrialEndDate(profile.created_at);
    return Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  // Show expiry modal on first load if expired and no dismissal in session
  useEffect(() => {
    if (isTrialExpired && !readOnlyDismissed) {
      setShowExpiryModal(true);
    }
  }, [isTrialExpired, readOnlyDismissed]);

  // NPS trigger: 7 days before trial ends
  useEffect(() => {
    if (npsChecked || !user || !profile) return;
    setNpsChecked(true);

    const isSubscribed = normalizedPlan !== "free";

    if (!isSubscribed && daysBeforeExpiry <= 7 && daysBeforeExpiry > 0) {
      const key = `nps_trial_end_${user.id}`;
      if (!localStorage.getItem(key)) {
        setTimeout(() => setShowNps(true), 2000);
      }
    }
  }, [user, profile, daysBeforeExpiry, npsChecked, normalizedPlan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isTrialExpired && showExpiryModal && !readOnlyDismissed) {
    return (
      <>
        <TrialExpiryModal
          open={showExpiryModal}
          onDismiss={() => {
            setShowExpiryModal(false);
            setReadOnlyDismissed(true);
          }}
          onSubscribe={() => {
            setShowExpiryModal(false);
            setReadOnlyDismissed(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <EmailVerificationBanner />
      {isTrialExpired && readOnlyDismissed && <ReadOnlyBanner />}
      {children}
      <NpsFeedbackModal
        open={showNps}
        onOpenChange={setShowNps}
        triggerType="trial_end"
      />
    </>
  );
};

export default AuthGuard;
