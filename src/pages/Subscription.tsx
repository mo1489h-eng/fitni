import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TrialBanner from "@/components/TrialBanner";
import TapTestModeBanner from "@/components/TapTestModeBanner";
import { TRAINER_PLAN_DETAILS } from "@/lib/plan-config";
import {
  Crown, Users, CheckCircle, AlertTriangle,
  CalendarDays, Loader2, Shield, ArrowLeft, Gem, Zap,
} from "lucide-react";

const PLAN_ICONS = {
  free: Shield,
  basic: CheckCircle,
  pro: Crown,
};

const Subscription = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { plan, isOnTrial, trialDaysLeft, trialEndDate, isTrialExpired, clientCount, maxClients } = usePlanLimits();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showPlans, setShowPlans] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentPlan = (plan || "free") as "free" | "basic" | "pro";
  const info = TRAINER_PLAN_DETAILS[currentPlan];
  const PlanIcon = PLAN_ICONS[currentPlan];

  const isSubscribed = currentPlan !== "free";
  const expiryDate = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date)
    : trialEndDate;

  const statusColor = isTrialExpired
    ? "bg-destructive/10 text-destructive"
    : isSubscribed
      ? "bg-primary/10 text-primary"
      : "bg-primary/10 text-primary";

  const statusLabel = isTrialExpired
    ? "منتهي"
    : isSubscribed
      ? "نشط"
      : "مجاني";

  const handleCancel = async () => {
    if (!user) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_plan: "free",
          payment_status: "cancelled",
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      setShowCancel(false);
      toast({ title: "تم إلغاء الاشتراك", description: "ستستمر في الوصول حتى نهاية الفترة الحالية" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const usagePercent = maxClients === Infinity ? 0 : Math.min((clientCount / maxClients) * 100, 100);

  return (
    <TrainerLayout>
      <div className="space-y-5 pb-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-1 hover:bg-[hsl(0_0%_10%)]" onClick={() => navigate("/settings")}>
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gem className="w-6 h-6 text-primary" strokeWidth={1.5} />
              باقتي
            </h1>
          </div>
        </div>

        {/* Current Plan */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-t-2 border-t-primary p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSubscribed ? "bg-primary/10" : "bg-[hsl(0_0%_10%)]"}`}>
                <PlanIcon className={`w-6 h-6 ${isSubscribed ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{info.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {info.price === 0 ? "0 ر.س" : `${info.price} ر.س/شهر`}
                </p>
              </div>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          <div className="border-t border-[hsl(0_0%_10%)] pt-4">
            <p className="text-sm font-medium text-foreground mb-3">المميزات المشمولة</p>
            <ul className="space-y-2.5">
              {info.includedFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <h2 className="text-lg font-bold text-foreground">استخدامك الحالي</h2>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">عدد العملاء</p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {clientCount} / {maxClients === Infinity ? "∞" : maxClients}
            </p>
          </div>

          {maxClients !== Infinity && (
            <div className="w-full bg-[hsl(0_0%_10%)] rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}

          {usagePercent >= 80 && maxClients !== Infinity && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/5 rounded-lg p-3 border border-warning/10">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>أنت قريب من الحد الأقصى. قم بالترقية للحصول على عملاء غير محدودين.</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <h2 className="text-lg font-bold text-foreground">التواريخ</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[hsl(0_0%_4%)] rounded-lg p-3 border border-[hsl(0_0%_10%)]">
              <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
              <p className="text-sm font-medium text-foreground">
                {expiryDate.toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {isOnTrial && (
              <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
                <span className="text-sm font-bold text-primary tabular-nums">{trialDaysLeft} يوم</span>
              </div>
            )}

            {profile?.subscribed_at && (
              <div className="flex items-center justify-between bg-[hsl(0_0%_4%)] rounded-lg p-3 border border-[hsl(0_0%_10%)]">
                <p className="text-sm text-muted-foreground">تاريخ الاشتراك</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(profile.subscribed_at).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button className="w-full gap-2 h-12 text-base" onClick={() => setShowPlans(true)}>
            <Zap className="w-5 h-5" strokeWidth={1.5} />
            ترقية الباقة
          </Button>

          {isSubscribed && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => setShowCancel(true)}
            >
              <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
              إلغاء الاشتراك
            </Button>
          )}
        </div>

        {/* Cancel Dialog */}
        <Dialog open={showCancel} onOpenChange={setShowCancel}>
          <DialogContent className="max-w-sm bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
            <DialogHeader>
              <DialogTitle className="text-center text-foreground">إلغاء الاشتراك</DialogTitle>
              <DialogDescription className="text-center">
                هل أنت متأكد من إلغاء اشتراكك؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4" dir="rtl">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">عند الإلغاء:</p>
                <ul className="space-y-1.5 mr-4">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" strokeWidth={1.5} />
                    ستفقد الوصول للمميزات المدفوعة
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" strokeWidth={1.5} />
                    سيتم تحويلك للباقة المجانية
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={1.5} />
                    بياناتك لن تُحذف
                  </li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent border-[hsl(0_0%_10%)]" onClick={() => setShowCancel(false)}>
                  تراجع
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  إلغاء الاشتراك
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
      </div>
    </TrainerLayout>
  );
};

export default Subscription;
