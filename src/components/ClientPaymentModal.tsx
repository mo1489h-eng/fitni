import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClientPaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  amount: number;
  billingCycle: string;
  onSuccess: () => void;
}

const PUBLISHABLE_KEY = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const ClientPaymentModal = ({ open, onClose, clientId, clientName, amount, billingCycle, onSuccess }: ClientPaymentModalProps) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const initializedRef = useRef(false);

  const cycleLabel = billingCycle === "quarterly" ? "ربع سنوي" : billingCycle === "yearly" ? "سنوي" : "شهري";

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    if (!formRef.current) return;

    if (!document.getElementById("moyasar-css")) {
      const link = document.createElement("link");
      link.id = "moyasar-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
      document.head.appendChild(link);
    }

    const loadMoyasar = () => {
      if ((window as any).Moyasar) { initForm(); return; }
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
        amount: amount * 100,
        currency: "SAR",
        description: `اشتراك ${clientName} — ${cycleLabel}`,
        publishable_api_key: PUBLISHABLE_KEY,
        callback_url: window.location.href,
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
            setError("لم يتم اكتمال الدفع");
          }
        },
        on_failure: () => setError("فشلت عملية الدفع"),
      });
    };

    setTimeout(loadMoyasar, 100);

    return () => { initializedRef.current = false; };
  }, [open]);

  const verifyPayment = async (paymentId: string) => {
    setVerifying(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-client-payment", {
        body: { payment_id: paymentId, client_id: clientId, amount, billing_cycle: billingCycle },
      });
      if (fnError || !data?.success) throw new Error(data?.error || "فشل التحقق");

      toast({ title: "تم الدفع بنجاح", description: `تم تسجيل دفعة ${clientName}` });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "خطأ في التحقق");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            تسجيل دفعة — {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-secondary rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{amount} <span className="text-sm">ر.س</span></p>
            <p className="text-sm text-muted-foreground">{cycleLabel}</p>
          </div>

          {verifying ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحقق...</p>
            </div>
          ) : (
            <div ref={formRef} className="moyasar-form" />
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPaymentModal;
