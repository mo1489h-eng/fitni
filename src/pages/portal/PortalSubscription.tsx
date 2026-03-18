import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, CalendarClock, CheckCircle, History, Loader2,
  AlertTriangle, XCircle, MessageCircle, Dumbbell, Apple, UserCheck, RefreshCw, ShieldCheck, X
} from "lucide-react";

const MOYASAR_PK = "pk_test_Xbpeegf8sy7yZcqAH3tTwdAhzZmxpFXhzFPUioZf";

const PortalSubscription = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const [showRenewal, setShowRenewal] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const moyasarInitRef = useRef(false);

  const { data: client, isLoading, refetch: refetchClient } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["portal-payments", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_payments")
        .select("*")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["portal-trainer-packages", client?.trainer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_packages")
        .select("*")
        .eq("trainer_id", client!.trainer_id!)
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.trainer_id,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["portal-trainer-profile", client?.trainer_id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profile", { p_user_id: client!.trainer_id! });
      return data?.[0] || null;
    },
    enabled: !!client?.trainer_id,
  });

  // Calculate subscription status
  const endDate = client ? new Date(client.subscription_end_date) : new Date();
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const isActive = daysLeft >= 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isExpiringTomorrow = daysLeft === 1;

  // Progress calculation (assuming 30-day cycle)
  const totalDays = client?.billing_cycle === "quarterly" ? 90 : client?.billing_cycle === "yearly" ? 365 : 30;
  const elapsed = totalDays - Math.max(daysLeft, 0);
  const progressPercent = Math.min(100, Math.max(0, (Math.max(daysLeft, 0) / totalDays) * 100));

  const cycleLabel = client?.billing_cycle === "quarterly" ? "ربع سنوي" : client?.billing_cycle === "yearly" ? "سنوي" : "شهري";

  // Find current package
  const currentPkg = packages.find(p => p.price === client?.subscription_price) || packages[0];

  // Selected package for renewal
  const selectedPkg = packages.find(p => p.id === selectedPkgId) || currentPkg;

  // Init Moyasar when renewal is shown and a package is selected
  useEffect(() => {
    if (!showRenewal || !selectedPkg || !formRef.current) return;
    moyasarInitRef.current = false;

    const loadAndInit = () => {
      if (!document.getElementById("moyasar-css")) {
        const link = document.createElement("link");
        link.id = "moyasar-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
        document.head.appendChild(link);
      }

      const init = () => {
        if (moyasarInitRef.current || !formRef.current) return;
        moyasarInitRef.current = true;
        formRef.current.innerHTML = "";

        (window as any).Moyasar.init({
          element: formRef.current,
          amount: selectedPkg!.price * 100,
          currency: "SAR",
          description: `تجديد اشتراك - ${selectedPkg!.name}`,
          publishable_api_key: MOYASAR_PK,
          callback_url: window.location.href,
          methods: ["creditcard", "applepay"],
          apple_pay: {
            country: "SA",
            label: "fitni",
            validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
          },
          on_completed: async (payment: any) => {
            if (payment.status === "paid") {
              await handlePaymentSuccess(payment.id);
            } else {
              setPayError("لم يتم اكتمال الدفع");
            }
          },
          on_failure: () => setPayError("فشلت عملية الدفع"),
        });
      };

      if ((window as any).Moyasar) { init(); return; }
      const script = document.createElement("script");
      script.src = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";
      script.onload = init;
      document.head.appendChild(script);
    };

    loadAndInit();
  }, [showRenewal, selectedPkgId]);

  const handlePaymentSuccess = async (paymentId: string) => {
    setVerifying(true);
    setPayError(null);
    try {
      const { data, error } = await supabase.functions.invoke("renew-subscription", {
        body: {
          payment_id: paymentId,
          client_id: client!.id,
          package_id: selectedPkg!.id,
          amount: selectedPkg!.price,
          billing_cycle: selectedPkg!.billing_cycle,
          portal_token: token,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || "فشل التحقق");
      toast({ title: "تم تجديد اشتراكك", description: `ساري حتى: ${new Date(data.period_end).toLocaleDateString("ar-SA")}` });
      setShowRenewal(false);
      refetchClient();
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const openWhatsApp = () => {
    if (!trainerProfile) return;
    const phone = (trainerProfile as any).phone || "";
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة بخصوص اشتراكي")}`, "_blank");
  };

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  if (!client) return <ClientPortalLayout><p className="text-center py-20 text-muted-foreground">لا توجد بيانات</p></ClientPortalLayout>;

  return (
    <ClientPortalLayout>
      {/* Expired full-screen modal */}
      {!isActive && !showRenewal && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">انتهى اشتراكك</h2>
            <p className="text-muted-foreground text-sm">جدد الآن للوصول لبرامجك وجداولك</p>
            <Button onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }} className="w-full" size="lg">
              <RefreshCw className="w-4 h-4 ml-2" /> جدد اشتراكك
            </Button>
            <Button variant="outline" onClick={openWhatsApp} className="w-full">
              <MessageCircle className="w-4 h-4 ml-2" /> تواصل مع مدربك
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4 animate-fade-in" dir="rtl">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">اشتراكي</h1>
        </div>

        {/* Expiry warnings */}
        {isExpiringSoon && !isExpiringTomorrow && (
          <div className="rounded-xl p-3 bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">⚠️ اشتراكك ينتهي خلال {daysLeft} أيام</p>
              <p className="text-xs text-muted-foreground">جدد الآن واستمر في رحلتك 💪</p>
            </div>
            <Button size="sm" onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }}>
              جدد الآن
            </Button>
          </div>
        )}

        {isExpiringTomorrow && (
          <div className="rounded-xl p-3 bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-400">⚠️ اشتراكك ينتهي غداً!</p>
            </div>
            <Button size="sm" onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }}>
              جدد الآن
            </Button>
          </div>
        )}

        {/* Renewal Payment Flow */}
        {showRenewal ? (
          <Card className="p-5 border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-card-foreground">تجديد الاشتراك 🔄</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowRenewal(false); moyasarInitRef.current = false; }}>✕</Button>
            </div>

            {/* Package selection */}
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">اختر باقتك:</p>
              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  onClick={() => { setSelectedPkgId(pkg.id); moyasarInitRef.current = false; }}
                  className={`rounded-xl p-3 border cursor-pointer transition-all ${selectedPkgId === pkg.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-card-foreground">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.description}</p>
                    </div>
                    <p className="font-bold text-primary">{pkg.price} <span className="text-xs">ر.س/{pkg.billing_cycle === "quarterly" ? "3 أشهر" : pkg.billing_cycle === "yearly" ? "سنة" : "شهر"}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pkg.includes_program && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">✓ برنامج تدريب</span>}
                    {pkg.includes_nutrition && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">✓ جدول غذائي</span>}
                    {pkg.includes_followup && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">✓ متابعة يومية</span>}
                    {pkg.sessions_per_week > 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">✓ {pkg.sessions_per_week} جلسات/أسبوع</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Moyasar form */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>ادفع بالبطاقة أو Apple Pay</span>
              </div>
              {verifying ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري التحقق من الدفع...</p>
                </div>
              ) : (
                <div ref={formRef} className="moyasar-form" />
              )}
              {payError && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{payError}</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">الدفع آمن ومشفر عبر Moyasar 🔒</p>
          </Card>
        ) : (
          <>
            {/* Current Plan Card */}
            <Card className={`p-5 ${isActive ? "border-primary/30" : "border-destructive/30"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-destructive/10"}`}>
                  {isActive ? <CheckCircle className="w-6 h-6 text-primary" /> : <XCircle className="w-6 h-6 text-destructive" />}
                </div>
                <div>
                  <p className="font-bold text-lg text-card-foreground">{currentPkg ? `باقة ${currentPkg.name}` : (isActive ? "اشتراك نشط" : "اشتراك منتهي")}</p>
                  <p className="text-sm text-muted-foreground">{cycleLabel}</p>
                </div>
              </div>

              {/* Expiry info + progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">تنتهي في: <span className="text-card-foreground font-medium">{endDate.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}</span></span>
                  <span className={`text-xs font-bold ${isActive ? (isExpiringSoon ? "text-yellow-400" : "text-primary") : "text-destructive"}`}>
                    {isActive ? `${Math.round(progressPercent)}% متبقي` : "منتهي"}
                  </span>
                </div>
                <Progress
                  value={progressPercent}
                  className={`h-2.5 ${!isActive ? "[&>div]:bg-destructive" : isExpiringSoon ? "[&>div]:bg-yellow-500" : ""}`}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-secondary-foreground">{client.subscription_price} <span className="text-xs">ر.س</span></p>
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                </div>
                <div className="bg-secondary rounded-xl p-3 text-center">
                  <CalendarClock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-secondary-foreground">{isActive ? daysLeft : 0} <span className="text-xs">يوم</span></p>
                  <p className="text-xs text-muted-foreground">متبقي</p>
                </div>
              </div>

              {/* Package includes */}
              {currentPkg && (
                <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">ما تشمل باقتك:</p>
                  <div className="space-y-1.5">
                    {currentPkg.sessions_per_week > 0 && (
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                        <Dumbbell className="w-3.5 h-3.5 text-primary" /> {currentPkg.sessions_per_week} جلسات أسبوعياً
                      </div>
                    )}
                    {currentPkg.includes_program && (
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" /> برنامج تدريب
                      </div>
                    )}
                    {currentPkg.includes_nutrition && (
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                        <Apple className="w-3.5 h-3.5 text-primary" /> جدول غذائي
                      </div>
                    )}
                    {currentPkg.includes_followup && (
                      <div className="flex items-center gap-2 text-sm text-secondary-foreground">
                        <UserCheck className="w-3.5 h-3.5 text-primary" /> متابعة يومية
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Early renewal button */}
              <Button
                onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }}
                className="w-full"
                variant={isActive ? "outline" : "default"}
                size="lg"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                {isActive ? "تجديد مبكر 🔄" : "جدد اشتراكك"}
              </Button>
            </Card>

            {/* Payment History */}
            <Card className="p-4">
              <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> سجل المدفوعات
              </h3>
              {payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-secondary-foreground">{Number(p.amount)} ر.س</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</p>
                      </div>
                      <div className="text-left">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {p.status === "paid" ? "مدفوع ✅" : "معلق"}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(p.period_start).toLocaleDateString("ar-SA")} — {new Date(p.period_end).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">لا توجد مدفوعات سابقة</p>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </ClientPortalLayout>
  );
};

export default PortalSubscription;
