import { useNavigate } from "react-router-dom";
import { usePortalToken, usePortalPath } from "@/hooks/usePortalToken";
import { useQuery } from "@tanstack/react-query";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import PortalPrivacySettings from "@/components/PortalPrivacySettings";
import PortalMoodSelector from "@/components/PortalMoodSelector";
import PortalReferral from "@/components/PortalReferral";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  User, CreditCard, CalendarClock, MessageCircle, Loader2,
  CheckCircle, XCircle, RefreshCw, Dumbbell, Shield, Bell, Lock, Languages
} from "lucide-react";

const PortalAccount = () => {
  const navigate = useNavigate();
  const { token } = usePortalToken();

  const { data: client, isLoading } = useQuery({
    queryKey: ["portal-client", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_by_portal_token", { p_token: token! });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["portal-trainer-profile", client?.trainer_id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profile", { p_user_id: client!.trainer_id! });
      return data?.[0] || null;
    },
    enabled: !!client?.trainer_id,
  });

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </ClientPortalLayout>
    );
  }

  if (!client) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-20 text-[hsl(0_0%_40%)]">لا توجد بيانات</div>
      </ClientPortalLayout>
    );
  }

  const endDate = new Date(client.subscription_end_date);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const isActive = daysLeft >= 0;
  const totalDays = client.billing_cycle === "quarterly" ? 90 : client.billing_cycle === "yearly" ? 365 : 30;
  const progressPercent = Math.min(100, Math.max(0, (Math.max(daysLeft, 0) / totalDays) * 100));

  const openWhatsApp = () => {
    if (!trainerProfile) return;
    const phone = (trainerProfile as any).phone || "";
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}`, "_blank");
  };

  return (
    <ClientPortalLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Profile Header */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{client.name}</h1>
              <p className="text-xs text-[hsl(0_0%_40%)]">{client.goal || "لا يوجد هدف محدد"}</p>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className={`bg-[hsl(0_0%_6%)] rounded-xl border border-t-2 p-5 ${isActive ? "border-[hsl(0_0%_10%)] border-t-primary" : "border-destructive/30 border-t-destructive"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-destructive/10"}`}>
              {isActive ? <CheckCircle className="w-5 h-5 text-primary" strokeWidth={1.5} /> : <XCircle className="w-5 h-5 text-destructive" strokeWidth={1.5} />}
            </div>
            <div>
              <p className="font-bold text-white">{isActive ? "اشتراك نشط" : "اشتراك منتهي"}</p>
              <p className="text-xs text-[hsl(0_0%_40%)]">{client.subscription_price} ر.س / {client.billing_cycle === "quarterly" ? "3 أشهر" : client.billing_cycle === "yearly" ? "سنة" : "شهر"}</p>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[hsl(0_0%_45%)]">تنتهي: {endDate.toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}</span>
              <span className={`font-bold ${isActive ? "text-primary" : "text-destructive"}`}>
                {isActive ? `${daysLeft} يوم متبقي` : "منتهي"}
              </span>
            </div>
            <Progress value={progressPercent} className={`h-1.5 ${!isActive ? "[&>div]:bg-destructive" : ""}`} />
          </div>

          <Button className="w-full" variant={isActive ? "outline" : "default"} size="sm"
            onClick={() => navigate(path("subscription"))}>
            <RefreshCw className="w-4 h-4 ml-1" strokeWidth={1.5} />
            {isActive ? "تجديد مبكر" : "جدد اشتراكك"}
          </Button>
        </div>

        {/* Trainer Info */}
        {trainerProfile && (
          <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" strokeWidth={1.5} />
              مدربك
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(0_0%_10%)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[hsl(0_0%_40%)]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{(trainerProfile as any).full_name}</p>
                  <p className="text-xs text-[hsl(0_0%_35%)]">{(trainerProfile as any).specialization || "مدرب شخصي"}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1 border-[hsl(0_0%_15%)] text-[hsl(0_0%_60%)]" onClick={openWhatsApp}>
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> رسالة
              </Button>
            </div>
          </div>
        )}

        {/* Referral */}
        <PortalReferral />

        {/* Mood */}
        <PortalMoodSelector />

        {/* Privacy */}
        <PortalPrivacySettings />

        {/* Settings Links */}
        <div className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] overflow-hidden">
          {[
            { icon: Lock, label: "تغيير كلمة المرور" },
            { icon: Bell, label: "تفضيلات الإشعارات" },
            { icon: Languages, label: "اللغة" },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-[hsl(0_0%_60%)] hover:bg-[hsl(0_0%_8%)] transition-colors border-b border-[hsl(0_0%_8%)] last:border-0">
              <item.icon className="w-4 h-4 text-[hsl(0_0%_30%)]" strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalAccount;
