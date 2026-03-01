import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";

const FREE_YEAR_DAYS = 365;

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
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

  // Check if free year expired and no subscription
  if (profile) {
    const plan = profile.subscription_plan;
    const isSubscribed = plan && plan !== "free" && plan !== null;
    if (!isSubscribed) {
      const createdAt = new Date(profile.created_at);
      const daysSinceCreation = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation >= FREE_YEAR_DAYS) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              انتهت السنة المجانية
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

  return <>{children}</>;
};

export default AuthGuard;
