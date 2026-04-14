import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { createPaymentSession } from "@/services/payments";
import { usePortalToken } from "@/hooks/usePortalToken";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, CalendarClock, CheckCircle, History, Loader2,
  AlertTriangle, XCircle, MessageCircle, Dumbbell, Apple, UserCheck, RefreshCw, ShieldCheck, X
} from "lucide-react";

const PortalSubscription = () => {
  const { token } = usePortalToken();
  const { toast } = useToast();
  const [showRenewal, setShowRenewal] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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
        .from("client_payments").select("*").eq("client_id", client!.id)
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
        .from("trainer_packages").select("*")
        .eq("trainer_id", client!.trainer_id!).eq("is_active", true)
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

  const endDate = client ? new Date(client.subscription_end_date) : new Date();
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const isActive = daysLeft >= 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 7;
  const isExpiringTomorrow = daysLeft === 1;

  const totalDays = client?.billing_cycle === "quarterly" ? 90 : client?.billing_cycle === "yearly" ? 365 : 30;
  const progressPercent = Math.min(100, Math.max(0, (Math.max(daysLeft, 0) / totalDays) * 100));
  const cycleLabel = client?.billing_cycle === "quarterly" ? "ربع سنوي" : client?.billing_cycle === "yearly" ? "سنوي" : "شهري";

  const currentPkg = packages.find(p => p.price === client?.subscription_price) || packages[0];
  const selectedPkg = packages.find(p => p.id === selectedPkgId) || currentPkg;

  const handlePay = async () => {
    if (!selectedPkg || !client) return;
    setLoading(true);
    setPayError(null);
    try {
      const { payment_url } = await createPaymentSession({
        amount: selectedPkg.price,
        currency: "SAR",
        description: `تجديد اشتراك - ${selectedPkg.name}`,
        customer: {},
        redirectUrl: `${window.location.origin}/payment/callback?type=renewal&client_id=${client.id}&package_id=${selectedPkg.id}&amount=${selectedPkg.price}&billing_cycle=${selectedPkg.billing_cycle}&portal_token=${token}`,
        metadata: {
          type: "renewal",
          client_id: client.id,
          trainer_id: client.trainer_id,
        },
      });
      window.location.href = payment_url;
    } catch (err: any) {
      setPayError(err.message || "حدث خطأ");
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (!trainerProfile) return;
    const phone = (trainerProfile as any).phone || "";
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة بخصوص اشتراكي")}`, "_blank");
  };

  if (isLoading) {
    return <ClientPortalLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></ClientPortalLayout>;
  }

  if (!client) return <ClientPortalLayout><p className="text-center py-20 text-muted-foreground">لا توجد بيانات</p></ClientPortalLayout>;

  return (
    <ClientPortalLayout>
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

        {isExpiringSoon && !isExpiringTomorrow && (
          <div className="rounded-xl p-3 bg-warning/10 border border-warning/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">اشتراكك ينتهي خلال {daysLeft} أيام</p>
              <p className="text-xs text-muted-foreground">جدد الآن واستمر في رحلتك</p>
            </div>
            <Button size="sm" onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }}>جدد الآن</Button>
          </div>
        )}

        {isExpiringTomorrow && (
          <div className="rounded-xl p-3 bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1"><p className="text-sm font-bold text-destructive">اشتراكك ينتهي غداً</p></div>
            <Button size="sm" onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }}>جدد الآن</Button>
          </div>
        )}

        {showRenewal ? (
          <Card className="p-5 border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-card-foreground">تجديد الاشتراك</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRenewal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">اختر باقتك:</p>
              {packages.map(pkg => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
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

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>ادفع عبر Tap Payments</span>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                {["Mada", "Visa", "MC", "Apple Pay", "STC Pay"].map(m => (
                  <span key={m} className="px-2 py-1 rounded bg-secondary text-xs text-secondary-foreground border border-border">{m}</span>
                ))}
              </div>
              <Button onClick={handlePay} disabled={loading} className="w-full h-12 gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                {loading ? "جاري التحويل..." : `ادفع ${selectedPkg?.price || 0} ر.س`}
              </Button>
              {payError && <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{payError}</div>}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <p>الدفع آمن ومشفر عبر Tap Payments</p>
            </div>
          </Card>
        ) : (
          <>
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

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">تنتهي في: <span className="text-card-foreground font-medium">{endDate.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}</span></span>
                  <span className={`text-xs font-bold ${isActive ? (isExpiringSoon ? "text-warning" : "text-primary") : "text-destructive"}`}>
                    {isActive ? `${Math.round(progressPercent)}% متبقي` : "منتهي"}
                  </span>
                </div>
                <Progress value={progressPercent} className={`h-2.5 ${!isActive ? "[&>div]:bg-destructive" : isExpiringSoon ? "[&>div]:bg-yellow-500" : ""}`} />
              </div>

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

              {currentPkg && (
                <div className="bg-secondary/50 rounded-xl p-3 mb-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">ما تشمل باقتك:</p>
                  <div className="space-y-1.5">
                    {currentPkg.sessions_per_week > 0 && <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Dumbbell className="w-3.5 h-3.5 text-primary" /> {currentPkg.sessions_per_week} جلسات أسبوعياً</div>}
                    {currentPkg.includes_program && <div className="flex items-center gap-2 text-sm text-secondary-foreground"><CheckCircle className="w-3.5 h-3.5 text-primary" /> برنامج تدريب</div>}
                    {currentPkg.includes_nutrition && <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Apple className="w-3.5 h-3.5 text-primary" /> جدول غذائي</div>}
                    {currentPkg.includes_followup && <div className="flex items-center gap-2 text-sm text-secondary-foreground"><UserCheck className="w-3.5 h-3.5 text-primary" /> متابعة يومية</div>}
                  </div>
                </div>
              )}

              <Button onClick={() => { setSelectedPkgId(currentPkg?.id || null); setShowRenewal(true); }} className="w-full" variant={isActive ? "outline" : "default"} size="lg">
                <RefreshCw className="w-4 h-4 ml-2" /> {isActive ? "تجديد مبكر" : "جدد اشتراكك"}
              </Button>
            </Card>

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
                          {p.status === "paid" ? "مدفوع" : "معلق"}
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
