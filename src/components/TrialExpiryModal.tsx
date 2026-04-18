import { useState } from "react";
import { Check, Lock, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TapPayment from "@/components/TapPayment";

interface TrialExpiryModalProps {
  open: boolean;
  onDismiss: () => void;
  onSubscribe: () => void;
}

const plans = [
  {
    key: "basic" as const,
    name: "أساسي",
    price: 99,
    icon: BadgeCheck,
    popular: false,
    features: ["20 عميلاً", "البرامج", "التقويم", "المدفوعات"],
  },
  {
    key: "pro" as const,
    name: "احترافي",
    price: 179,
    icon: Star,
    popular: true,
    features: ["غير محدود", "AI كوبايلت", "التحديات", "المتجر"],
  },
];

const TrialExpiryModal = ({ open, onDismiss, onSubscribe }: TrialExpiryModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(null);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-background p-0 [&>button]:hidden"
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6" dir="rtl">
          {selectedPlan ? (
            <div>
              <h2 className="mb-4 text-center text-xl font-bold text-foreground">إتمام الدفع</h2>
              <TapPayment
                plan={selectedPlan}
                onSuccess={() => {
                  onSubscribe();
                }}
                onBack={() => setSelectedPlan(null)}
              />
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <Lock className="h-8 w-8 text-destructive" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-foreground">انتهت فترتك المجانية</h2>
                <p className="mt-1 text-sm text-muted-foreground">3 شهور من التجربة الكاملة</p>
                <p className="mt-2 text-sm text-foreground/70">اختر باقتك للاستمرار</p>
              </div>

              <div className="space-y-4">
                {plans.map((plan) => (
                  <Card
                    key={plan.key}
                    className={`relative cursor-pointer p-5 transition-all hover:border-primary/40 ${
                      plan.popular ? "border-2 border-primary shadow-lg shadow-primary/10" : ""
                    }`}
                    onClick={() => setSelectedPlan(plan.key)}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        الأكثر شعبية
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <plan.icon
                        className={`h-5 w-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`}
                        strokeWidth={1.5}
                      />
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {plan.features.join(" | ")}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className="text-2xl font-black text-primary">{plan.price}</span>
                        <span className="mr-1 text-xs text-muted-foreground">ر.س/شهر</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={onDismiss}
                  className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
                >
                  تصفح فقط (محدود)
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiryModal;
