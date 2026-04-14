import { useState } from "react";
import { BadgeCheck, Check, Loader2, ShieldCheck, Sparkles, Star } from "lucide-react";

import TapPayment from "@/components/TapPayment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { cn } from "@/lib/utils";

const PRICING_PLANS = [
  {
    key: "basic" as const,
    name: "أساسي",
    price: 99,
    cta: "ابدأ الآن",
    popular: false,
    icon: BadgeCheck,
    features: [
      "حتى 20 عميلاً",
      "منشئ برامج التمارين",
      "بوابة العميل",
      "تتبع تقدم أساسي",
      "تتبع الحضور",
      "إشعارات واتساب",
      "صفحة المدرب العامة",
    ],
  },
  {
    key: "pro" as const,
    name: "احترافي",
    price: 179,
    cta: "ابدأ مع Pro",
    popular: true,
    icon: Sparkles,
    features: [
      "عملاء غير محدودين",
      "كل ما في الباقة الأساسية",
      "كوبايلت AI (Gemini)",
      "أدوات التغذية",
      "تحديات جماعية",
      "تحليلات متقدمة وتقارير أسبوعية",
      "ربط الأجهزة القابلة للارتداء",
      "الخزينة التعليمية",
      "مكتبة قوالب البرامج",
      "دعم أولوية",
    ],
  },
];

export interface PricingPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after Tap checkout succeeds */
  onSubscribeSuccess?: () => void;
}

export function PricingPlansModal({ open, onOpenChange, onSubscribeSuccess }: PricingPlansModalProps) {
  const { profile } = useAuth();
  const { isOnTrial, founderDiscountAvailable } = usePlanLimits();
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedPlan(null);
    onOpenChange(next);
  };

  const isSubscribed =
    profile?.subscription_plan === "basic" || profile?.subscription_plan === "pro";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        dir="rtl"
        aria-describedby="pricing-plans-desc"
        className={cn(
          "max-h-[92vh] gap-0 overflow-hidden border-primary/25 bg-[hsl(0_0%_6%)] p-0 shadow-2xl shadow-black/50 duration-300",
          "max-w-[min(100%,56rem)] sm:rounded-2xl",
        )}
      >
        <div className="border-b border-border/80 bg-gradient-to-b from-primary/[0.07] to-transparent px-6 pb-4 pt-6">
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground md:text-2xl">
              {!profile ? "جاري التحميل…" : selectedPlan ? "إتمام الدفع" : "باقات CoachBase"}
            </DialogTitle>
            <DialogDescription id="pricing-plans-desc" className="text-sm text-muted-foreground">
              {selectedPlan
                ? "أكمل الدفع عبر Tap بأمان"
                : "اختر الباقة المناسبة لنمو عملك — أسعار شفافة بالريال السعودي"}
            </DialogDescription>
          </DialogHeader>
          {profile && !selectedPlan && isOnTrial && !isSubscribed ? (
            <p className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.08] px-4 py-3 text-center text-sm font-medium text-primary">
              أنت حالياً في الفترة المجانية — اشترك قبل انتهائها
            </p>
          ) : null}
        </div>

        <div className="max-h-[min(70vh,720px)] overflow-y-auto px-4 py-5 sm:px-6">
          {!profile ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
            </div>
          ) : selectedPlan ? (
            <TapPayment
              plan={selectedPlan}
              onSuccess={() => {
                handleOpenChange(false);
                onSubscribeSuccess?.();
              }}
              onBack={() => setSelectedPlan(null)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {PRICING_PLANS.map((plan) => {
                const isCurrent = isSubscribed && profile.subscription_plan === plan.key;
                const showFounderPrice = plan.key === "pro" && founderDiscountAvailable;
                const displayPrice = showFounderPrice ? 99 : plan.price;
                const PlanIcon = plan.icon;

                return (
                  <Card
                    key={plan.key}
                    className={cn(
                      "relative flex flex-col border-border/80 bg-[hsl(0_0%_8%)] p-5 shadow-lg transition-shadow",
                      plan.popular && "border-2 border-primary/50 shadow-primary/10 md:scale-[1.02]",
                      isCurrent && "border-2 border-emerald-500/60",
                    )}
                  >
                    {plan.popular && !isCurrent ? (
                      <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-md">
                        <Star className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        الأكثر شيوعاً
                      </span>
                    ) : null}

                    {isCurrent ? (
                      <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        باقتك الحالية
                      </span>
                    ) : null}

                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          plan.popular ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <PlanIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-baseline gap-2 border-b border-border/60 pb-4">
                      <span className="text-4xl font-black tabular-nums text-primary">{displayPrice}</span>
                      {showFounderPrice ? (
                        <span className="text-lg font-semibold text-muted-foreground line-through">{plan.price}</span>
                      ) : null}
                      <span className="text-sm font-medium text-muted-foreground">ر.س / شهر</span>
                    </div>

                    {showFounderPrice && plan.key === "pro" ? (
                      <p className="mb-3 text-xs font-medium text-primary">عرض المؤسسين: الشهر الأول 99 ر.س ثم {plan.price} ر.س</p>
                    ) : null}

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5 text-sm leading-snug text-foreground/95">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        <Check className="ml-2 h-4 w-4" strokeWidth={2} aria-hidden />
                        مفعّلة
                      </Button>
                    ) : (
                      <Button
                        className="w-full font-semibold"
                        variant={plan.popular ? "default" : "outline"}
                        size="lg"
                        onClick={() => setSelectedPlan(plan.key)}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
