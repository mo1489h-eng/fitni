import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MoyasarPaymentProps {
  plan: "basic" | "pro";
  onSuccess: () => void;
  onBack: () => void;
}

const PUBLISHABLE_KEY = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const MoyasarPayment = ({ plan, onSuccess, onBack }: MoyasarPaymentProps) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const initializedRef = useRef(false);

  const amount = plan === "basic" ? 4900 : 6900;
  const planName = plan === "basic" ? "أساسي" : "احترافي";

  useEffect(() => {
    if (initializedRef.current) return;
    if (!formRef.current || !PUBLISHABLE_KEY) return;

    // Load Moyasar CSS
    if (!document.getElementById("moyasar-css")) {
      const link = document.createElement("link");
      link.id = "moyasar-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    // Load Moyasar JS
    const loadMoyasar = () => {
      if ((window as any).Moyasar) {
        initForm();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = () => initForm();
      document.head.appendChild(script);
    };

    const initForm = () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      (window as any).Moyasar.init({
        element: formRef.current,
        amount,
        currency: "SAR",
        description: `اشتراك fitni - باقة ${planName}`,
        publishable_api_key: PUBLISHABLE_KEY,
        callback_url: window.location.origin + "/dashboard",
        methods: ["creditcard", "applepay"],
        apple_pay: {
          country: "SA",
          label: "fitni",
          validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
        },
        on_completed: async (payment: any) => {
          if (payment.status === "paid") {
            await verifyPayment(payment.id);
          } else {
            setError("لم يتم اكتمال الدفع. حاول مرة أخرى");
          }
        },
        on_failure: () => {
          setError("فشلت عملية الدفع. حاول مرة أخرى");
        },
      });
    };

    loadMoyasar();

    return () => {
      initializedRef.current = false;
    };
  }, []);

  const verifyPayment = async (paymentId: string) => {
    setVerifying(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-payment", {
        body: { payment_id: paymentId, plan },
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || "فشل التحقق من الدفع");
      }

      await refreshProfile();

      toast({
        title: "تم الدفع بنجاح",
        description: `تم تفعيل باقة ${planName}`,
      });

      onSuccess();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "حدث خطأ في التحقق من الدفع");
    } finally {
      setVerifying(false);
    }
  };

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive text-sm">لم يتم إعداد بوابة الدفع</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h3 className="font-bold text-foreground">الدفع — باقة {planName}</h3>
          <p className="text-sm text-muted-foreground">
            {(amount / 100).toLocaleString()} ر.س/شهر
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          <span>ادفع بالبطاقة الائتمانية أو Apple Pay</span>
        </div>

        {verifying ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري التحقق من الدفع...</p>
          </div>
        ) : (
          <div ref={formRef} className="moyasar-form" />
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        الدفع آمن ومشفر عبر Moyasar 🔒
      </p>
    </div>
  );
};

export default MoyasarPayment;
