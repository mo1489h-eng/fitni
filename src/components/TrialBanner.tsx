import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

const TRIAL_DAYS = 14;

const plans = [
  { name: "شهري", price: "99", period: "/شهر", popular: false },
  { name: "سنوي", price: "79", period: "/شهر", popular: true, save: "وفّر 20%" },
];

const TrialBanner = () => {
  const { profile } = useAuth();
  const [showPlans, setShowPlans] = useState(false);

  if (!profile) return null;

  const createdAt = new Date(profile.created_at);
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(TRIAL_DAYS - daysSinceCreation, 0);
  const expired = daysLeft <= 0;

  return (
    <>
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${
        expired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      }`}>
        <span className="font-medium">
          {expired
            ? "انتهت التجربة المجانية — اشترك للاستمرار"
            : `🎉 تجربة مجانية — باقي ${daysLeft} يوم`}
        </span>
        <Button size="sm" variant={expired ? "destructive" : "default"} onClick={() => setShowPlans(true)}>
          {expired ? "اشترك الآن" : "الباقات"}
        </Button>
      </div>

      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>اختر باقتك</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={`p-5 ${plan.popular ? "border-primary border-2" : ""}`}>
                {plan.popular && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium mb-2 inline-block">الأفضل</span>
                )}
                <h3 className="text-lg font-bold text-card-foreground">{plan.name}</h3>
                <p className="text-2xl font-black text-primary mt-1">
                  {plan.price} <span className="text-sm font-normal text-muted-foreground">ر.س{plan.period}</span>
                </p>
                {plan.save && <p className="text-xs text-success mt-1">{plan.save}</p>}
                <Button className="w-full mt-4" variant={plan.popular ? "default" : "outline"}>
                  اشترك
                </Button>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialBanner;
