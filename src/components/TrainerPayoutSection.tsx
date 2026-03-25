import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Loader2, Clock, CheckCircle, AlertCircle } from "lucide-react";

const TrainerPayoutSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState("");

  const { data: paymentSettings } = useQuery({
    queryKey: ["trainer-payment-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trainer_payment_settings")
        .select("*")
        .eq("trainer_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["payout-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_payments")
        .select("*")
        .eq("status", "paid");
      return data || [];
    },
    enabled: !!user,
  });

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalCommission = Math.round(totalPaid * 0.1);
  const totalPaidOut = payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingPayout = payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const availableBalance = totalPaid - totalCommission - totalPaidOut - pendingPayout;

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!paymentSettings) throw new Error("أعدادات الدفع غير مكتملة");
      const amt = Number(amount);
      if (amt < 100) throw new Error("الحد الأدنى 100 ريال");
      if (amt > availableBalance) throw new Error("الرصيد غير كافي");
      
      const { error } = await supabase.from("payout_requests").insert({
        trainer_id: user!.id,
        amount: amt,
        iban: paymentSettings.iban,
        bank_name: paymentSettings.bank_name,
        account_holder_name: paymentSettings.account_holder_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payout-requests"] });
      setShowRequest(false);
      setAmount("");
      toast({ title: "تم إرسال طلب التحويل", description: "سيتم التحويل خلال 3-5 أيام عمل" });
    },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const statusIcon: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-warning" />,
    completed: <CheckCircle className="w-4 h-4 text-primary" />,
    rejected: <AlertCircle className="w-4 h-4 text-destructive" />,
  };

  const statusLabel: Record<string, string> = {
    pending: "قيد المعالجة",
    completed: "تم التحويل",
    rejected: "مرفوض",
  };

  return (
    <>
      {/* Balance Card */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-card-foreground">رصيدك المتاح</h3>
        </div>
        <p className="text-3xl font-black text-primary">{availableBalance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ر.س</span></p>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">إجمالي المدفوعات</span>
            <span className="text-card-foreground">{totalPaid.toLocaleString()} ر.س</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">عمولة CoachBase (10%)</span>
            <span className="text-destructive">-{totalCommission.toLocaleString()} ر.س</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تم تحويله</span>
            <span className="text-card-foreground">-{totalPaidOut.toLocaleString()} ر.س</span>
          </div>
          {pendingPayout > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">قيد التحويل</span>
              <span className="text-warning">-{pendingPayout.toLocaleString()} ر.س</span>
            </div>
          )}
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => setShowRequest(true)}
          disabled={availableBalance < 100 || !paymentSettings?.iban}
        >
          <Banknote className="w-4 h-4" />
          طلب تحويل للحساب البنكي
        </Button>
        {!paymentSettings?.iban && (
          <p className="text-xs text-destructive text-center">أضف بيانات الحساب البنكي في الإعدادات أولاً</p>
        )}
      </Card>

      {/* Payout History */}
      {payouts.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="font-bold text-card-foreground">سجل التحويلات</h3>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {statusIcon[p.status]}
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{Number(p.amount).toLocaleString()} ر.س</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.status === "completed" ? "bg-primary/10 text-primary" :
                  p.status === "pending" ? "bg-warning/10 text-warning" :
                  "bg-destructive/10 text-destructive"
                }`}>{statusLabel[p.status]}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Request Payout Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>طلب تحويل</DialogTitle>
            <DialogDescription>الحد الأدنى 100 ريال • التحويل خلال 3-5 أيام عمل</DialogDescription>
          </DialogHeader>
          <div className="space-y-4" dir="rtl">
            <div>
              <label className="text-sm font-medium text-foreground">المبلغ (ر.س)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
              <p className="text-xs text-muted-foreground mt-1">الرصيد المتاح: {availableBalance.toLocaleString()} ر.س</p>
            </div>
            {paymentSettings && (
              <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                <p className="text-muted-foreground">سيتم التحويل إلى:</p>
                <p className="text-card-foreground font-medium">{paymentSettings.account_holder_name}</p>
                <p className="text-card-foreground font-mono text-xs" dir="ltr">{paymentSettings.iban}</p>
                <p className="text-muted-foreground">{paymentSettings.bank_name}</p>
              </div>
            )}
            <Button
              className="w-full gap-2"
              onClick={() => requestMutation.mutate()}
              disabled={requestMutation.isPending || !amount || Number(amount) < 100}
            >
              {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تأكيد طلب التحويل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainerPayoutSection;
