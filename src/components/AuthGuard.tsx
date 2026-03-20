import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FREE_TRIAL_DAYS = 183; // 6 months

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

  // Check if free year expired and no subscription
  if (profile) {
    const plan = profile.subscription_plan;
    const isSubscribed = plan && plan !== "free" && plan !== null;
    if (!isSubscribed) {
      const createdAt = new Date(profile.created_at);
      const daysSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation >= FREE_TRIAL_DAYS) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
               انتهت الفترة التجريبية المجانية
             </h1>
             <p className="text-muted-foreground text-sm mb-6 max-w-xs">
               اشترك للاستمرار في استخدام fitni وإدارة عملائك
            </p>
            <Button onClick={() => setShowPlans(true)}>اشترك الآن</Button>
            <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
          </div>
        );
      }
    }
  }

  return (
    <>
      {!emailConfirmed && <EmailConfirmBanner />}
      {children}
    </>
  );
};

export default AuthGuard;
