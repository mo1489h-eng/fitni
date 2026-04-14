import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { verifyPlatformPayment } from "@/services/payments";

/**
 * Generic success landing after Tap redirect: verifies charge server-side and credits trainer wallet
 * when metadata matches verify-platform-payment (trainer_id + type program|subscription).
 * Tap appends `tap_id` to the redirect URL.
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const tapId =
      searchParams.get("tap_id") ||
      searchParams.get("payment_id") ||
      searchParams.get("id");

    if (!tapId) {
      setStatus("error");
      setErrorMsg("لم يتم العثور على معرف الدفع");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await verifyPlatformPayment(tapId);
        if (!cancelled) setStatus("success");
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "فشل التحقق من الدفع");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-sm w-full p-8 text-center space-y-4">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">جاري التحقق من الدفع...</h2>
            <p className="text-sm text-muted-foreground">لا تغلق هذه الصفحة</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">تم الدفع بنجاح</h2>
            <p className="text-sm text-muted-foreground">تم تسجيل العملية في أرباح المدرب.</p>
            <Button onClick={() => navigate("/")} className="mt-2 w-full">
              العودة للرئيسية
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">تعذر التحقق من الدفع</h2>
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="mt-4 w-full">
              العودة للرئيسية
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
