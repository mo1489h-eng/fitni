import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialBanner from "@/components/TrialBanner";

const ReadOnlyBanner = () => {
  const [showPlans, setShowPlans] = useState(false);

  return (
    <>
      <div
        className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-foreground">حسابك في وضع القراءة فقط</p>
            <p className="text-xs text-muted-foreground">اشترك للاستمرار في العمل</p>
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setShowPlans(true)}>
          اشترك الآن
        </Button>
      </div>
      <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
    </>
  );
};

export default ReadOnlyBanner;
