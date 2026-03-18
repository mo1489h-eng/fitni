import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Check, Gift, Star, X } from "lucide-react";
import MoyasarPayment from "@/components/MoyasarPayment";

const plans = [
  {
    key: "basic" as const,
    name: "أساسي",
    price: 49,
    icon: Check,
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
    price: 69,
    icon: Star,
    popular: true,
    features: [
      "عملاء غير محدودين",
      "كل مميزات الأساسي",
      "AI كوبايلت",
      "التحديات الجماعية",
      "سوق البرامج",
      "Nearby Discovery + دعم أولوية",
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
  const { isOnTrial, trialEndDate, isTrialExpired } = usePlanLimits();
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

  const isSubscribed = profile.subscription_plan && profile.subscription_plan !== "free";

  const banner = !isSubscribed && !dismissed ? (
    isTrialExpired ? (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm bg-destructive/10 text-destructive">
        <span className="font-medium">انتهت الفترة المجانية — اشترك للاستمرار</span>
        <Button size="sm" variant="destructive" onClick={() => setShowPlans(true)}>
          اشترك الآن
        </Button>
      </div>
    ) : isOnTrial ? (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm bg-success/10 text-success">
        <span className="font-medium">
          🎉 مجاني لأول 6 أشهر — بدون بطاقة ائتمان — ينتهي في {trialEndDate.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
        </span>
        <Button size="sm" variant="ghost" className="text-success hover:text-success h-7 w-7 p-0" onClick={() => setDismissed(true)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    ) : null
  ) : null;

  return (
    <>
      {banner}

      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {selectedPlan ? "إتمام الدفع" : "اختر باقتك"}
            </DialogTitle>
          </DialogHeader>

          {selectedPlan ? (
            <MoyasarPayment
              plan={selectedPlan}
              onSuccess={() => {
                setShowPlans(false);
                onSubscribe?.();
              }}
              onBack={() => setSelectedPlan(null)}
            />
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground mb-1">
                مجاني لأول 6 أشهر • بدون بطاقة ائتمان • ابدأ خلال دقيقتين
              </p>

              <div className="space-y-4">
                {plans.map((plan) => {
                  const isCurrent = isSubscribed && profile.subscription_plan === plan.key;
                  return (
                    <Card
                      key={plan.key}
                      className={`p-5 relative ${plan.popular ? "border-primary border-2 shadow-lg" : ""} ${isCurrent ? "border-success border-2" : ""}`}
                    >
                      {plan.popular && !isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          الأكثر طلباً
                        </span>
                      )}
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-success text-primary-foreground px-3 py-1 rounded-full font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          باقتك الحالية
                        </span>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <plan.icon className={`w-5 h-5 ${isCurrent ? "text-success" : plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                        <h3 className="text-lg font-bold text-card-foreground">{plan.name}</h3>
                      </div>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-3xl font-black text-primary">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">ر.س/شهر</span>
                      </div>

                      <ul className="space-y-2 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-card-foreground">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <Button className="w-full" variant="outline" disabled>
                          <Check className="w-4 h-4 ml-1" />
                          مفعّلة
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          onClick={() => setSelectedPlan(plan.key)}
                        >
                          {plan.key === "pro" ? "ترقية للاحترافي - 69 ريال/شهر ←" : isSubscribed ? "تغيير إلى الأساسي" : "اشترك في الأساسي"}
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
