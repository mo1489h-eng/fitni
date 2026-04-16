import { useState, useEffect, useCallback } from "react";
import { Mail, RefreshCw, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { sendVerificationEmail, syncVerificationStatus } from "@/lib/auth-verification";
import { toast } from "sonner";

const SUCCESS_DISMISS_KEY = "coachbase_email_verified_banner_dismissed";

/**
 * Non-intrusive banner: encourages optional email verification without blocking the app.
 * Uses `profiles.email_verified` (synced from Supabase Auth when the user confirms).
 */
export function EmailVerificationBanner() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successDismissed, setSuccessDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      if (sessionStorage.getItem(`${SUCCESS_DISMISS_KEY}_${user.id}`) === "1") {
        setSuccessDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const dismissSuccess = useCallback(() => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(`${SUCCESS_DISMISS_KEY}_${user.id}`, "1");
    } catch {
      /* ignore */
    }
    setSuccessDismissed(true);
  }, [user?.id]);

  const onVerifyClick = async () => {
    setSending(true);
    const { error } = await sendVerificationEmail();
    if (error) {
      toast.error("تعذّر إرسال الرابط", { description: error.message });
    } else {
      toast.success("تم إرسال رابط التأكيد إلى بريدك");
    }
    setSending(false);
  };

  const onSyncClick = async () => {
    setSyncing(true);
    const { error } = await syncVerificationStatus();
    if (error) {
      toast.error("تعذّر المزامنة", { description: error.message });
    } else {
      await refreshProfile();
      toast.success("تم تحديث حالة التأكيد");
    }
    setSyncing(false);
  };

  if (profileLoading || !user || !profile) return null;

  if (profile.email_verified === true) {
    if (successDismissed) return null;
    return (
      <div
        className="mx-4 mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 flex items-center justify-between gap-3"
        dir="rtl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground">تم تأكيد بريدك الإلكتروني</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismissSuccess} aria-label="إغلاق">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      dir="rtl"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 flex-shrink-0">
          <Mail className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">لم يتم تأكيد الإيميل</p>
          <p className="text-xs text-muted-foreground">أكّد بريدك لإتمام عمليات حساسة مثل السحب المالي</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
          onClick={onVerifyClick}
          disabled={sending}
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
          تأكيد الآن
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onSyncClick} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حدّث الحالة"}
        </Button>
      </div>
    </div>
  );
}
