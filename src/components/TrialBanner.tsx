import { useState } from "react";
import { ArrowLeft, CreditCard, Gift, X } from "lucide-react";

import { PricingPlansModal } from "@/components/pricing/PricingPlansModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface TrialBannerProps {
  onSubscribe?: () => void;
  showPlans?: boolean;
  onShowPlansChange?: (open: boolean) => void;
}

const TrialBanner = ({ onSubscribe, showPlans: externalShowPlans, onShowPlansChange }: TrialBannerProps) => {
  const { profile } = useAuth();
  const { isOnTrial, trialEndDate, isTrialExpired } = usePlanLimits();
  const [internalShowPlans, setInternalShowPlans] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const showPlans = externalShowPlans ?? internalShowPlans;

  const setShowPlans = (open: boolean) => {
    onShowPlansChange?.(open);
    setInternalShowPlans(open);
  };

  if (!profile) return null;

  const isSubscribed = profile.subscription_plan === "basic" || profile.subscription_plan === "pro";
  const formattedTrialEnd = trialEndDate.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const banner = !isSubscribed && !dismissed ? (
    isTrialExpired ? (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-5 py-4">
        <div className="flex items-center gap-3 text-destructive">
          <CreditCard className="h-5 w-5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold">انتهت الفترة المجانية</p>
            <p className="text-xs text-destructive/80">اختر باقتك للاستمرار في استخدام المنصة.</p>
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setShowPlans(true)}>
          اشترك الآن
        </Button>
      </div>
    ) : isOnTrial ? (
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 text-primary">
          <Gift className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">فترة الإطلاق المجانية فعالة</p>
            <p className="text-xs text-primary/80">مجاني لأول 3 أشهر وينتهي في {formattedTrialEnd}</p>
            <button
              type="button"
              onClick={() => setShowPlans(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              استعرض الباقات
              <ArrowLeft className="h-3.5 w-3.5 opacity-90" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="self-end rounded-full p-1 text-primary/75 transition-colors hover:bg-primary/10 hover:text-primary sm:self-center"
          onClick={() => setDismissed(true)}
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    ) : null
  ) : null;

  return (
    <>
      {banner}

      <PricingPlansModal open={showPlans} onOpenChange={setShowPlans} onSubscribeSuccess={onSubscribe} />
    </>
  );
};

export default TrialBanner;
