import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createPaymentSession } from "@/services/payments";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TapTestModeBanner from "@/components/TapTestModeBanner";

interface TapPaymentProps {
  plan: "basic" | "pro";
  onSuccess: () => void;
  onBack: () => void;
}

const PAYMENT_ICONS = [
  { name: "Mada", color: "#004B87" },
  { name: "Visa", color: "#1A1F71" },
  { name: "MC", color: "#EB001B" },
  { name: "Apple Pay", color: "#000" },
  { name: "STC Pay", color: "#4F008C" },
];

const TapPayment = ({ plan, onBack }: TapPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const isFounder = profile?.is_founder === true && !profile?.founder_discount_used;
  const amount = plan === "basic" ? 99 : (isFounder ? 99 : 179);
  const planName = plan === "basic" ? "أساسي" : "احترافي";

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      // Store payment context for callback
      sessionStorage.setItem("tap_payment_context", JSON.stringify({
        type: "trainer_subscription",
        plan,
        return_url: window.location.origin + "/dashboard",
      }));

      const { payment_url } = await createPaymentSession({
        amount,
        currency: "SAR",
        description: `اشتراك CoachBase - باقة ${planName}`,
        customer: {
          name: user?.user_metadata?.full_name || "Trainer",
          email: user?.email || "",
        },
        redirectUrl: `${window.location.origin}/payment/callback?type=trainer_subscription&plan=${plan}`,
        metadata: { type: "trainer_subscription", plan, user_id: user?.id, is_founder: isFounder },
      });

      window.location.href = payment_url;
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <TapTestModeBanner />
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h3 className="font-bold text-foreground">الدفع — باقة {planName}</h3>
          <p className="text-sm text-muted-foreground">{amount} ر.س/شهر</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          <span>اختر طريقة الدفع</span>
        </div>

        {/* Payment methods icons */}
        <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
          {PAYMENT_ICONS.map((pm) => (
            <div key={pm.name} className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground border border-border">
              {pm.name}
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded-xl p-4 text-center mb-4">
          <p className="text-3xl font-black text-primary">{amount}</p>
          <p className="text-sm text-muted-foreground">ر.س / شهرياً</p>
        </div>

        <Button
          onClick={handlePay}
          disabled={loading}
          className="w-full h-12 text-base gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CreditCard className="w-5 h-5" />
          )}
          {loading ? "جاري التحويل..." : "ادفع الآن"}
        </Button>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        الدفع آمن ومشفر عبر Tap Payments
      </p>
    </div>
  );
};

export default TapPayment;
