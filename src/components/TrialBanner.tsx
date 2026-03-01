import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Check, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WHATSAPP_NUMBER = "966500000000";

const plans = [
  {
    key: "basic",
    name: "أساسي",
    monthlyPrice: 99,
    annualPrice: 79,
    icon: Check,
    popular: false,
    features: [
      "حتى 10 عملاء",
      "برامج تدريب غير محدودة",
      "متابعة التقدم",
      "استقبال مدفوعات",
    ],
  },
  {
    key: "pro",
    name: "احترافي",
    monthlyPrice: 199,
    annualPrice: 159,
    icon: Star,
    popular: true,
    features: [
      "عملاء غير محدودين",
      "كل مميزات الأساسي",
      "شعارك الخاص",
      "تقارير متقدمة",
      "أولوية في الدعم",
    ],
  },
];

interface TrialBannerProps {
  onSubscribe?: () => void;
  showPlans?: boolean;
  onShowPlansChange?: (open: boolean) => void;
}

const TrialBanner = ({ onSubscribe, showPlans: externalShowPlans, onShowPlansChange }: TrialBannerProps) => {
  const { profile, user, refreshProfile } = useAuth();
  const { isOnTrial, freeYearEndDate, isTrialExpired } = usePlanLimits();
  const [internalShowPlans, setInternalShowPlans] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  const showPlans = externalShowPlans ?? internalShowPlans;
  const setShowPlans = (open: boolean) => {
    onShowPlansChange?.(open);
    setInternalShowPlans(open);
  };

  if (!profile) return null;

  const isSubscribed = profile.subscription_plan && profile.subscription_plan !== "free";

  // Free year banner
  const banner = !isSubscribed && !dismissed ? (
    isTrialExpired ? (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm bg-destructive/10 text-destructive">
        <span className="font-medium">انتهت السنة المجانية — اشترك للاستمرار</span>
        <Button size="sm" variant="destructive" onClick={() => setShowPlans(true)}>
          اشترك الآن
        </Button>
      </div>
    ) : isOnTrial ? (
      <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm bg-success/10 text-success">
        <span className="font-medium">
          🎉 أنت تستمتع بالوصول الكامل مجاناً لمدة سنة كاملة — ينتهي في {freeYearEndDate.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-success hover:text-success h-7 w-7 p-0" onClick={() => setDismissed(true)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    ) : null
  ) : null;

  const handleSubscribe = async (planKey: string) => {
    setSubscribing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_plan: planKey,
          subscribed_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);

      if (error) throw error;
      await refreshProfile();

      toast({
        title: "تم تفعيل اشتراكك! 🎉",
        description: "سيتم التواصل معك خلال 24 ساعة على واتساب",
      });

      setShowPlans(false);

      const planName = plans.find((p) => p.key === planKey)?.name || planKey;
      const price = annual
        ? plans.find((p) => p.key === planKey)?.annualPrice
        : plans.find((p) => p.key === planKey)?.monthlyPrice;
      const billingType = annual ? "سنوي" : "شهري";
      const msg = encodeURIComponent(
        `مرحباً، أرغب بالاشتراك في باقة "${planName}" (${price} ر.س/${billingType === "سنوي" ? "شهر - سنوي" : "شهر"}). الإيميل: ${user?.email}`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

      onSubscribe?.();
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      {banner}

      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">اختر باقتك</DialogTitle>
          </DialogHeader>

          <p className="text-center text-sm text-muted-foreground mb-1">
            الأسعار تبدأ بعد انتهاء السنة المجانية
          </p>
          <p className="text-center text-xs text-success font-medium mb-4">
            ابدأ الآن مجاناً - لا حاجة لبطاقة ائتمان
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !annual ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                annual ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              سنوي
              <span className="text-xs mr-1 opacity-80">(وفّر 20%)</span>
            </button>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice;
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
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-success text-white px-3 py-1 rounded-full font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      باقتك الحالية
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <plan.icon className={`w-5 h-5 ${isCurrent ? "text-success" : plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="text-lg font-bold text-card-foreground">{plan.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-black text-primary">{price}</span>
                    <span className="text-sm text-muted-foreground">ر.س/شهر</span>
                  </div>

                  {annual && plan.monthlyPrice !== plan.annualPrice && (
                    <p className="text-xs text-success mb-3">
                      بدلاً من {plan.monthlyPrice} ر.س — وفّر {(plan.monthlyPrice - plan.annualPrice) * 12} ر.س سنوياً
                    </p>
                  )}

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
                      disabled={subscribing}
                      onClick={() => handleSubscribe(plan.key)}
                    >
                      {isSubscribed ? "ترقية" : "اشترك"}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialBanner;
