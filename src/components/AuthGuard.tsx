import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";
import TrialExpiryModal from "@/components/TrialExpiryModal";
import ReadOnlyBanner from "@/components/ReadOnlyBanner";
import NpsFeedbackModal from "@/components/NpsFeedbackModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTrialEndDate } from "@/lib/trial-config";

const EmailConfirmBanner = () => {
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const resendConfirmation = async () => {
    if (!user?.email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) {
      toast.error("حدث خطأ في إرسال الرابط");
    } else {
      toast.success("تم إرسال رابط التأكيد مجدداً");
    }
    setSending(false);
  };

  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between gap-3" dir="rtl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
          <Mail className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">بريدك الإلكتروني غير مؤكد</p>
          <p className="text-xs text-muted-foreground">أكّد بريدك لتفعيل جميع الميزات</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="flex-shrink-0 gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
        onClick={resendConfirmation}
        disabled={sending}
      >
        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
        أرسل رابط التأكيد
      </Button>
    </div>
  );
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, session, profile, loading } = useAuth();
  const [showPlans, setShowPlans] = useState(false);
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

  const emailConfirmed = user.email_confirmed_at || user.confirmed_at;

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
      {!emailConfirmed && <EmailConfirmBanner />}
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
