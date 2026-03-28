import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ClientPaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  amount: number;
  billingCycle: string;
  onSuccess: () => void;
}

const ClientPaymentModal = ({ open, onClose, clientId, clientName, amount, billingCycle, onSuccess }: ClientPaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const cycleLabel = billingCycle === "quarterly" ? "ربع سنوي" : billingCycle === "yearly" ? "سنوي" : "شهري";

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-tap-charge", {
        body: {
          amount,
          currency: "SAR",
          description: `اشتراك ${clientName} — ${cycleLabel}`,
          customer: { name: clientName },
          redirect_url: `${window.location.origin}/payment/callback?type=client_payment&client_id=${clientId}&amount=${amount}&billing_cycle=${billingCycle}`,
          metadata: { type: "client_payment", client_id: clientId },
        },
      });

      if (fnError || !data?.redirect_url) {
        throw new Error(data?.error || "فشل إنشاء عملية الدفع");
      }

      window.location.href = data.redirect_url;
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
      setLoading(false);
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

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {["Mada", "Visa", "MC", "Apple Pay", "STC Pay"].map(m => (
              <span key={m} className="px-2 py-1 rounded bg-secondary text-xs text-secondary-foreground border border-border">{m}</span>
            ))}
          </div>

          <Button onClick={handlePay} disabled={loading} className="w-full h-12 gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {loading ? "جاري التحويل..." : "ادفع الآن عبر Tap"}
          </Button>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPaymentModal;
