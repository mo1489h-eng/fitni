import { useState } from "react";
import { BadgeCheck, Check, CreditCard, Gift, ShieldCheck, Star, X } from "lucide-react";

import TapPayment from "@/components/TapPayment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const plans = [
  {
    key: "basic" as const,
    name: "أساسي",
    price: 99,
    icon: BadgeCheck,
    popular: false,
    features: [
      "حتى 10 عملاء",
      "إدارة العملاء",
      "البرامج التدريبية والتغذية",
      "التقويم وبوابة العميل",
      "التقارير الأسبوعية",
      "المدفوعات والتحليلات الأساسية",
    ],
  },
  {
    key: "pro" as const,
    name: "احترافي",
    price: 179,
    icon: Star,
    popular: true,
    features: [
      "عملاء غير محدودين",
      "كل مميزات الأساسي",
      "AI كوبايلت",
      "التحديات الجماعية",
      "سوق البرامج",
      "Nearby Discovery ودعم أولوية",
    ],
  },
];

interface TrialBannerProps {
  onSubscribe?: () => void;
  showPlans?: boolean;
  onShowPlansChange?: (open: boolean) => void;
}

const TrialBanner = ({ onSubscribe, showPlans: externalShowPlans, onShowPlansChange }: TrialBannerProps) => {
  const { profile } = useAuth();
  const { isOnTrial, trialEndDate, isTrialExpired, founderDiscountAvailable } = usePlanLimits();
  const [internalShowPlans, setInternalShowPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const showPlans = externalShowPlans ?? internalShowPlans;

  const setShowPlans = (open: boolean) => {
    onShowPlansChange?.(open);
    setInternalShowPlans(open);
    if (!open) setSelectedPlan(null);
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
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4">
        <div className="flex items-center gap-3 text-primary">
          <Gift className="h-5 w-5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold">فترة الإطلاق المجانية فعالة</p>
            <p className="text-xs text-primary/80">مجاني لأول 6 أشهر وينتهي في {formattedTrialEnd}</p>
          </div>
        </div>
        <button type="button" className="rounded-full p-1 text-primary/75 transition-colors hover:bg-primary/10 hover:text-primary" onClick={() => setDismissed(true)} aria-label="إغلاق">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    ) : null
  ) : null;

  return (
    <>
      {banner}

      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">{selectedPlan ? "إتمام الدفع" : "اختر باقتك"}</DialogTitle>
          </DialogHeader>

          {selectedPlan ? (
            <TapPayment
              plan={selectedPlan}
              onSuccess={() => {
                setShowPlans(false);
                onSubscribe?.();
              }}
              onBack={() => setSelectedPlan(null)}
            />
          ) : (
            <>
              <p className="mb-1 text-center text-sm text-muted-foreground">مجاني لأول 6 أشهر، بدون بطاقة ائتمان، وتفعيل سريع خلال دقائق</p>

              <div className="space-y-4">
                {plans.map((plan) => {
                  const isCurrent = isSubscribed && profile.subscription_plan === plan.key;

                  return (
                    <Card
                      key={plan.key}
                      className={`relative p-5 ${plan.popular ? "border-primary border-2 shadow-lg shadow-primary/10" : ""} ${isCurrent ? "border-success border-2" : ""}`}
                    >
                      {plan.popular && !isCurrent ? (
                        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                          <Star className="h-3 w-3" strokeWidth={1.5} />
                          الأكثر طلباً
                        </span>
                      ) : null}

                      {isCurrent ? (
                        <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-success px-3 py-1 text-xs font-medium text-success-foreground">
                          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                          باقتك الحالية
                        </span>
                      ) : null}

                      <div className="mb-2 flex items-center gap-2">
                        <plan.icon className={`h-5 w-5 ${isCurrent ? "text-success" : plan.popular ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                        <h3 className="text-lg font-bold text-card-foreground">{plan.name}</h3>
                      </div>

                      <div className="mb-3 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-primary">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">ر.س/شهر</span>
                      </div>

                      <ul className="mb-4 space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-card-foreground">
                            <Check className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.5} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <Button className="w-full" variant="outline" disabled>
                          <Check className="ml-1 h-4 w-4" strokeWidth={1.5} />
                          مفعّلة
                        </Button>
                      ) : (
                        <Button className="w-full" variant={plan.popular ? "default" : "outline"} onClick={() => setSelectedPlan(plan.key)}>
                          {plan.key === "pro" ? "ترقية للاحترافي" : isSubscribed ? "تغيير إلى الأساسي" : "اشترك في الأساسي"}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialBanner;
