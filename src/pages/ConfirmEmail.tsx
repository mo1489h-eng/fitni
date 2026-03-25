import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, RefreshCw, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const RESEND_COOLDOWN = 60;

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already confirmed, redirect to dashboard
  useEffect(() => {
    if (user && (user.email_confirmed_at || user.confirmed_at)) {
      toast.success("تم تأكيد بريدك الإلكتروني بنجاح");
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const resendEmail = async () => {
    if (!emailParam || countdown > 0) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: emailParam,
    });
    if (error) {
      toast.error("حدث خطأ في إرسال الرابط");
    } else {
      toast.success("تم إرسال رابط التأكيد مجدداً");
      setCountdown(RESEND_COOLDOWN);
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-2xl font-black text-primary">CoachBase</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 md:p-10 text-center space-y-6">
          {/* Mail Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Mail className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">تحقق من بريدك الإلكتروني</h1>
            <p className="text-muted-foreground text-sm">أرسلنا رابط التأكيد إلى:</p>
            {emailParam && (
              <p className="text-foreground font-semibold text-base" dir="ltr">
                {emailParam}
              </p>
            )}
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            انقر على الرابط في الإيميل للمتابعة إلى CoachBase
          </p>

          {/* Spam Note */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-foreground flex-shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground text-right">
              تفقد مجلد الرسائل غير المرغوب فيها (Spam) إذا لم تجد الرسالة
            </p>
          </div>

          {/* Resend Button */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">لم تستلم الإيميل؟</p>
            {countdown > 0 ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                إعادة الإرسال خلال {countdown} ثانية
              </p>
            ) : (
              <Button
                variant="outline"
                onClick={resendEmail}
                disabled={sending}
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                )}
                إعادة الإرسال
              </Button>
            )}
          </div>

          {/* Login Link */}
          <div className="pt-2 border-t border-border">
            <Button variant="ghost" asChild className="text-sm">
              <Link to="/login">انتقل لتسجيل الدخول</Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            العودة للرئيسية
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ConfirmEmail;
