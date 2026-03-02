import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TrialBanner from "@/components/TrialBanner";
import {
  CreditCard, Crown, Users, CheckCircle, AlertTriangle,
  Calendar, Loader2, Shield, Star, ArrowLeft,
} from "lucide-react";

const PLAN_INFO: Record<string, { name: string; price: number; icon: any; features: string[] }> = {
  free: {
    name: "مجاني (فترة تجريبية)",
    price: 0,
    icon: Shield,
    features: ["جميع المميزات", "6 شهور مجاناً"],
  },
  basic: {
    name: "أساسي",
    price: 49,
    icon: CheckCircle,
    features: ["حتى 10 عملاء", "برامج تدريب غير محدودة", "متابعة التقدم", "استقبال مدفوعات"],
  },
  pro: {
    name: "احترافي",
    price: 69,
    icon: Crown,
    features: ["عملاء غير محدودين", "كل مميزات الأساسي", "شعارك الخاص", "تقارير متقدمة", "أولوية في الدعم"],
  },
};

const Subscription = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { plan, isOnTrial, trialDaysLeft, trialEndDate, isTrialExpired, clientCount, maxClients } = usePlanLimits();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showPlans, setShowPlans] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const currentPlan = plan || "free";
  const info = PLAN_INFO[currentPlan] || PLAN_INFO.free;
  const PlanIcon = info.icon;

  const isSubscribed = currentPlan !== "free";

  const statusColor = isTrialExpired
    ? "bg-destructive/10 text-destructive"
    : isSubscribed
    ? "bg-success/10 text-success"
    : "bg-primary/10 text-primary";

  const statusLabel = isTrialExpired
    ? "منتهي"
    : isSubscribed
    ? "نشط"
    : "فترة تجريبية";

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
      toast({ title: "تم إلغاء الاشتراك", description: "ستستمر في الوصول حتى نهاية الفترة المدفوعة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <TrainerLayout>
      <div className="space-y-5 animate-fade-in pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-1" onClick={() => navigate("/settings")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">إدارة الاشتراك</h1>
        </div>

        {/* Current Plan Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSubscribed ? "bg-primary/10" : "bg-muted"}`}>
                <PlanIcon className={`w-6 h-6 ${isSubscribed ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-card-foreground">{info.name}</h2>
                {info.price > 0 && (
                  <p className="text-sm text-muted-foreground">{info.price} ر.س/شهر</p>
                )}
              </div>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          <Separator />

          {/* Plan Features */}
          <div>
            <p className="text-sm font-medium text-card-foreground mb-2">مميزات باقتك</p>
            <ul className="space-y-2">
              {info.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Usage Stats */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">استخدامك الحالي</h2>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">عدد العملاء</p>
            <p className="text-sm font-bold text-card-foreground">
              {clientCount} / {maxClients === Infinity ? "∞" : maxClients}
            </p>
          </div>

          {maxClients !== Infinity && (
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min((clientCount / maxClients) * 100, 100)}%` }}
              />
            </div>
          )}
        </Card>

        {/* Dates Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">التواريخ</h2>
          </div>

          {profile?.subscribed_at && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">تاريخ الاشتراك</p>
              <p className="text-sm font-medium text-card-foreground">
                {new Date(profile.subscribed_at).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          {isOnTrial && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">نهاية الفترة التجريبية</p>
                <p className="text-sm font-medium text-card-foreground">
                  {trialEndDate.toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
                <span className="text-sm font-bold text-primary">{trialDaysLeft} يوم</span>
              </div>
            </>
          )}

          {profile?.created_at && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">تاريخ إنشاء الحساب</p>
              <p className="text-sm font-medium text-card-foreground">
                {new Date(profile.created_at).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button className="w-full gap-2" onClick={() => setShowPlans(true)}>
            <Star className="w-4 h-4" />
            {isSubscribed ? "تغيير الباقة" : "اشترك الآن"}
          </Button>

          {isSubscribed && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => setShowCancel(true)}
            >
              <AlertTriangle className="w-4 h-4" />
              إلغاء الاشتراك
            </Button>
          )}
        </div>

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancel} onOpenChange={setShowCancel}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">إلغاء الاشتراك</DialogTitle>
              <DialogDescription className="text-center">
                هل أنت متأكد من إلغاء اشتراكك؟
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-muted-foreground space-y-2">
                <p>عند الإلغاء:</p>
                <ul className="space-y-1 mr-4">
                  <li>• ستفقد الوصول للمميزات المدفوعة</li>
                  <li>• سيتم تحويلك للباقة المجانية</li>
                  <li>• بيانات عملائك لن تُحذف</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCancel(false)}>
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
