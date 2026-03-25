import { useState } from "react";
import ProgressPhotos from "@/components/ProgressPhotos";
import TrainerBodyScans from "@/components/TrainerBodyScans";
import ClientPaymentModal from "@/components/ClientPaymentModal";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, CreditCard, ClipboardList,
  Loader2, ArrowLeft, Check, Dumbbell, CalendarDays, Copy, Send,
  TrendingUp, TrendingDown, Scale, ChevronDown, ChevronUp, Video, DollarSign,
  Sparkles, Eye, Activity, UserCheck,
} from "lucide-react";
import ClientPdfReport from "@/components/ClientPdfReport";
import CopilotPanel from "@/components/CopilotPanel";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

type TabKey = "overview" | "copilot" | "program" | "payments" | "measurements" | "bodyscans";
const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "نظرة عامة", icon: Eye },
  { key: "copilot", label: "المساعد", icon: Sparkles },
  { key: "program", label: "البرنامج", icon: ClipboardList },
  { key: "bodyscans", label: "بيانات الجسم", icon: Activity },
  { key: "payments", label: "المدفوعات", icon: CreditCard },
  { key: "measurements", label: "القياسات", icon: Scale },
];

function ClientPaymentsTab({ client, status, clientId, queryClient: qc }: { client: any; status: string; clientId: string; queryClient: any }) {
  const [editPrice, setEditPrice] = useState(String(client.subscription_price || ""));
  const [editCycle, setEditCycle] = useState((client as any).billing_cycle || "monthly");
  const [saving, setSaving] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const { toast } = useToast();

  const { data: clientPayments = [] } = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_payments").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      subscription_price: parseFloat(editPrice) || 0,
      billing_cycle: editCycle,
    }).eq("id", clientId);
    setSaving(false);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["client", clientId] });
    toast({ title: "تم حفظ الإعدادات" });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
        <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" strokeWidth={1.5} /> إعدادات الاشتراك
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">السعر (ريال)</label>
            <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">دورة الدفع</label>
            <Select value={editCycle} onValueChange={setEditCycle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">شهري</SelectItem>
                <SelectItem value="quarterly">ربع سنوي (3 شهور)</SelectItem>
                <SelectItem value="yearly">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الإعدادات"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">الاشتراك الحالي</p>
            <p className="text-2xl font-bold text-card-foreground">{client.subscription_price} ر.س</p>
            <p className="text-xs text-muted-foreground mt-1">ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              status === "active" ? "bg-emerald-500/10 text-emerald-400" :
              status === "overdue" ? "bg-red-500/10 text-red-400" :
              "bg-amber-500/10 text-amber-400"
            }`}>
              {status === "active" ? "نشط" : status === "overdue" ? "منتهي" : "ينتهي قريبا"}
            </span>
            <Button size="sm" onClick={() => setShowPayModal(true)}>
              <CreditCard className="w-4 h-4 ml-1" strokeWidth={1.5} /> تسجيل دفعة
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
        <h3 className="font-bold text-card-foreground mb-3">سجل المدفوعات</h3>
        {clientPayments.length > 0 ? (
          <div className="space-y-2">
            {clientPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[hsl(0_0%_5%)] rounded-lg p-3 border border-[hsl(0_0%_10%)]">
                <div>
                  <p className="text-sm font-medium text-foreground">{Number(p.amount)} ر.س</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-SA")}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {p.status === "paid" ? "مدفوع" : "معلق"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="w-6 h-6 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
            <p className="text-xs">لا توجد مدفوعات مسجلة</p>
          </div>
        )}
      </Card>

      {showPayModal && (
        <ClientPaymentModal
          open={showPayModal} onClose={() => setShowPayModal(false)}
          clientId={clientId} clientName={client.name}
          amount={client.subscription_price || 0}
          billingCycle={(client as any).billing_cycle || "monthly"}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["client-payments", clientId] })}
        />
      )}
    </div>
  );
}

function getPaymentStatus(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "expiring";
  return "active";
}

const ClientProfile = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newFat, setNewFat] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: measurements } = useQuery({
    queryKey: ["measurements", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements").select("*").eq("client_id", id!).order("recorded_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignedProgram } = useQuery({
    queryKey: ["assigned-program", client?.program_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*, program_days(*, program_exercises(*))").eq("id", client!.program_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!client?.program_id,
  });

  const addMeasurement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("measurements").insert({ client_id: id!, weight: parseFloat(newWeight), fat_percentage: parseFloat(newFat || "0") });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements", id] });
      setNewWeight(""); setNewFat("");
      toast({ title: "تم حفظ القياس" });
    },
  });

  const assignProgram = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from("clients").update({ program_id: programId }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      queryClient.invalidateQueries({ queryKey: ["assigned-program"] });
      setShowProgramModal(false);
      toast({ title: "تم تعيين البرنامج" });
    },
  });

  if (isLoading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></TrainerLayout>;
  }

  if (!client) {
    return (
      <TrainerLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">لم يتم العثور على العميل</p>
          <Link to="/clients"><Button variant="outline">العودة للقائمة</Button></Link>
        </div>
      </TrainerLayout>
    );
  }

  const status = getPaymentStatus(client.subscription_end_date);
  const whatsappUrl = `https://wa.me/966${client.phone.replace(/^0/, "")}`;
  const initials = client.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
  const totalWeeks = 12;
  const progressPercent = Math.min((client.week_number / totalWeeks) * 100, 100);
  const lastWorkoutDays = Math.ceil((Date.now() - new Date(client.last_workout_date).getTime()) / 86400000);
  const daysUntilEnd = Math.ceil((new Date(client.subscription_end_date).getTime() - Date.now()) / 86400000);

  const chartData = (measurements || []).map((m) => ({
    date: new Date(m.recorded_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
    weight: Number(m.weight),
  }));

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link to="/clients" className="flex items-center gap-1 text-sm text-primary hover:underline font-medium">
            العملاء <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <ClientPdfReport client={client} measurements={measurements || []} />
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <MessageCircle className="w-4 h-4" strokeWidth={1.5} /> واتساب
              </Button>
            </a>
          </div>
        </div>

        {/* Header Card */}
        <Card className="p-5 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{client.goal}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(0_0%_10%)] text-muted-foreground font-medium">
                  الأسبوع {client.week_number}
                </span>
                <span className="text-xs text-muted-foreground">
                  انضم {new Date(client.created_at).toLocaleDateString("ar-SA")}
                </span>
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-2 mb-4">
            {[
              { icon: MessageCircle, label: "واتساب", href: whatsappUrl },
              { icon: ClipboardList, label: "البرنامج", action: () => setActiveTab("program") },
              { icon: CreditCard, label: "المدفوعات", action: () => setActiveTab("payments") },
            ].map((act) => (
              <Button key={act.label} variant="outline" size="sm" className="flex-1 gap-1 text-xs"
                onClick={act.action ? act.action : undefined}
                asChild={!!act.href}
              >
                {act.href ? (
                  <a href={act.href} target="_blank" rel="noopener noreferrer">
                    <act.icon className="w-3.5 h-3.5" strokeWidth={1.5} /> {act.label}
                  </a>
                ) : (
                  <><act.icon className="w-3.5 h-3.5" strokeWidth={1.5} /> {act.label}</>
                )}
              </Button>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>الأسبوع {client.week_number} من {totalWeeks}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "آخر تمرين", value: lastWorkoutDays === 0 ? "اليوم" : `${lastWorkoutDays}`, unit: lastWorkoutDays === 0 ? "" : "يوم", icon: CalendarDays },
              { label: "الاشتراك", value: `${client.subscription_price}`, unit: "ر.س", icon: CreditCard },
              { label: "ينتهي خلال", value: daysUntilEnd < 0 ? "منتهي" : `${daysUntilEnd}`, unit: daysUntilEnd < 0 ? "" : "يوم", icon: UserCheck },
            ].map((stat) => (
              <div key={stat.label} className="text-center bg-[hsl(0_0%_5%)] border border-[hsl(0_0%_10%)] rounded-lg p-2.5">
                <stat.icon className="w-4 h-4 mx-auto text-primary mb-1" strokeWidth={1.5} />
                <p className="text-base font-bold text-foreground leading-none">
                  {stat.value}<span className="text-xs font-normal text-muted-foreground mr-0.5">{stat.unit}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Portal Link */}
        {client.portal_token && (
          <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
            <h3 className="font-bold text-card-foreground mb-2">رابط المتدرب</h3>
            <p className="text-xs text-muted-foreground mb-3">شارك هذا الرابط مع عميلك لمتابعة تمارينه</p>
            <div className="bg-[hsl(0_0%_5%)] rounded-lg p-2.5 text-xs text-muted-foreground dir-ltr text-left mb-3 break-all border border-[hsl(0_0%_10%)]">
              {window.location.origin}/client-portal/{client.portal_token}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/client-portal/${client.portal_token}`);
                toast({ title: "تم نسخ الرابط" });
              }}>
                <Copy className="w-4 h-4" strokeWidth={1.5} /> نسخ الرابط
              </Button>
              <a href={`https://wa.me/${client.phone ? "966" + client.phone.replace(/^0/, "") : ""}?text=${encodeURIComponent(`أهلا! برنامجك جاهز على CoachBase، افتح الرابط لتشوف تمارينك ${window.location.origin}/client-portal/${client.portal_token}`)}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1 w-full">
                  <Send className="w-4 h-4" strokeWidth={1.5} /> إرسال واتساب
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* Invite Link */}
        {(client as any).invite_token && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <h3 className="font-bold text-card-foreground mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" strokeWidth={1.5} /> رابط تسجيل المتدرب
            </h3>
            <p className="text-xs text-muted-foreground mb-3">أرسل هذا الرابط لعميلك لإنشاء حسابه الخاص</p>
            <div className="bg-[hsl(0_0%_5%)] rounded-lg p-2.5 text-xs text-muted-foreground dir-ltr text-left mb-3 break-all border border-[hsl(0_0%_10%)]">
              {window.location.origin}/client-register/{(client as any).invite_token}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/client-register/${(client as any).invite_token}`);
                toast({ title: "تم نسخ رابط التسجيل" });
              }}>
                <Copy className="w-4 h-4" strokeWidth={1.5} /> نسخ الرابط
              </Button>
              <a href={`https://wa.me/${client.phone ? "966" + client.phone.replace(/^0/, "") : ""}?text=${encodeURIComponent(`مرحبا ${client.name}\nمدربك أضافك على CoachBase\nأنشئ حسابك المجاني:\n${window.location.origin}/client-register/${(client as any).invite_token}`)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1 w-full">
                  <Send className="w-4 h-4" strokeWidth={1.5} /> إرسال دعوة واتساب
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="أقسام ملف العميل" className="flex border-b border-[hsl(0_0%_10%)] overflow-x-auto">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key} type="button" role="tab"
                id={`client-tab-${tab.key}`}
                aria-selected={isSelected}
                aria-controls={`client-panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 whitespace-nowrap px-2 py-2.5 text-center text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                  isSelected ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {tab.label}
                {isSelected && <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div role="tabpanel" id={`client-panel-${activeTab}`} aria-labelledby={`client-tab-${activeTab}`} className="animate-fade-in">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" strokeWidth={1.5} /> تطور الوزن
                </h3>
                {chartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 53%)" }} stroke="hsl(0 0% 11%)" />
                        <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "hsl(0 0% 53%)" }} stroke="hsl(0 0% 11%)" />
                        <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 10%)", borderRadius: 8 }} />
                        <Line type="monotone" dataKey="weight" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(142 76% 36%)" }} name="الوزن" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                    <p className="text-sm">لا توجد قياسات بعد</p>
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">الاشتراك</p>
                    <p className="text-lg font-bold text-foreground">{client.subscription_price} ر.س / شهر</p>
                    <p className="text-xs text-muted-foreground">ينتهي: {new Date(client.subscription_end_date).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                    status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                    status === "overdue" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {status === "active" ? "نشط" : status === "overdue" ? "متأخر" : "ينتهي قريبا"}
                  </span>
                </div>
              </Card>

              {/* Quick Reminders — no emojis */}
              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <h3 className="font-bold text-card-foreground mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" strokeWidth={1.5} /> تذكيرات سريعة
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "تذكير شرب الماء", msg: `أهلا ${client.name}! تذكر تشرب ماء كافي اليوم على الأقل 3 لتر` },
                    { label: "باقي وجبة", msg: `أهلا ${client.name}! لا تنسى وجبتك القادمة. الالتزام بالحمية مهم جدا` },
                    { label: "موعد تمرينك", msg: `أهلا ${client.name}! موعد تمرينك اليوم لا تفوته!` },
                    { label: "أحسنت!", msg: `أحسنت ${client.name}! أكمل تمارينك وحميتك واستمر على هذا المستوى` },
                  ].map((r) => (
                    <a key={r.label} href={`${whatsappUrl}?text=${encodeURIComponent(r.msg)}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                        <MessageCircle className="w-3 h-3" strokeWidth={1.5} /> {r.label}
                      </Button>
                    </a>
                  ))}
                </div>
              </Card>

              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <h3 className="font-bold text-card-foreground mb-2">معلومات العميل</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">الجوال</span><span className="text-foreground" dir="ltr">{client.phone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">الهدف</span><span className="text-foreground">{client.goal}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">تاريخ الانضمام</span><span className="text-foreground">{new Date(client.created_at).toLocaleDateString("ar-SA")}</span></div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "copilot" && <CopilotPanel clientId={id!} clientName={client.name} />}

          {activeTab === "program" && (
            <div className="space-y-4">
              {client.program_id && assignedProgram ? (
                <>
                  <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-foreground">{assignedProgram.name}</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{assignedProgram.weeks} أسابيع</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowProgramModal(true)}>تغيير البرنامج</Button>
                  </Card>
                  {(assignedProgram as any).program_days?.sort((a: any, b: any) => a.day_order - b.day_order).map((day: any) => (
                    <Card key={day.id} className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                      <h4 className="font-bold text-foreground mb-2">{day.day_name}</h4>
                      {day.program_exercises?.length > 0 ? (
                        <div className="space-y-2">
                          {day.program_exercises.sort((a: any, b: any) => a.exercise_order - b.exercise_order).map((ex: any) => (
                            <div key={ex.id} className="flex items-center justify-between bg-[hsl(0_0%_5%)] rounded-lg p-2.5 border border-[hsl(0_0%_10%)]">
                              <span className="text-sm text-foreground font-medium">
                                {ex.name}
                                {ex.video_url && (
                                  <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex mr-1.5 text-primary hover:text-primary/80">
                                    <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  </a>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">{ex.sets}×{ex.reps} {ex.weight > 0 && `• ${ex.weight} كجم`}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">لا توجد تمارين</p>}
                    </Card>
                  ))}
                </>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                  <p className="text-sm">لم يتم تعيين برنامج بعد</p>
                  <Button className="mt-4 gap-1" onClick={() => setShowProgramModal(true)}>
                    <ClipboardList className="w-4 h-4" strokeWidth={1.5} /> تعيين برنامج
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === "bodyscans" && (
            <TrainerBodyScans clientId={id!} clientPhone={client.phone} clientName={client.name} portalToken={client.portal_token} />
          )}

          {activeTab === "payments" && (
            <ClientPaymentsTab client={client} status={status} clientId={id!} queryClient={queryClient} />
          )}

          {activeTab === "measurements" && (
            <div className="space-y-4">
              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <h3 className="font-bold text-foreground mb-3">إضافة قياس جديد</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الوزن (كجم)</label>
                    <Input type="number" placeholder="75" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">نسبة الدهون %</label>
                    <Input type="number" placeholder="20" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
                  </div>
                </div>
                <Button className="w-full" disabled={!newWeight || addMeasurement.isPending} onClick={() => addMeasurement.mutate()}>
                  {addMeasurement.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
              </Card>

              <Card className="p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
                <h3 className="font-bold text-foreground mb-3">سجل القياسات</h3>
                {measurements && measurements.length > 0 ? (
                  <div className="space-y-2">
                    {[...measurements].reverse().map((m, i, arr) => {
                      const prev = arr[i + 1];
                      const weightDiff = prev ? Number(m.weight) - Number(prev.weight) : 0;
                      return (
                        <div key={m.id} className="flex items-center justify-between bg-[hsl(0_0%_5%)] rounded-lg p-3 border border-[hsl(0_0%_10%)]">
                          <div>
                            <p className="text-xs text-muted-foreground">{new Date(m.recorded_at).toLocaleDateString("ar-SA")}</p>
                            <p className="text-sm font-bold text-foreground">
                              {Number(m.weight)} كجم
                              {Number(m.fat_percentage) > 0 && <span className="text-xs font-normal text-muted-foreground mr-2">دهون {Number(m.fat_percentage)}%</span>}
                            </p>
                          </div>
                          {prev && weightDiff !== 0 && (
                            <span className={`flex items-center text-xs font-medium ${weightDiff < 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {weightDiff < 0 ? <TrendingDown className="w-3 h-3 ml-0.5" strokeWidth={1.5} /> : <TrendingUp className="w-3 h-3 ml-0.5" strokeWidth={1.5} />}
                              {Math.abs(weightDiff).toFixed(1)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Scale className="w-6 h-6 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                    <p className="text-xs">لا توجد قياسات بعد</p>
                  </div>
                )}
              </Card>
              <ProgressPhotos clientId={id!} uploadedBy="trainer" trainerId={client.trainer_id || undefined} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showProgramModal} onOpenChange={setShowProgramModal}>
        <DialogContent className="bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)]">
          <DialogHeader><DialogTitle>تعيين برنامج</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {programs && programs.length > 0 ? programs.map((p) => (
              <button key={p.id} onClick={() => assignProgram.mutate(p.id)}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  client.program_id === p.id ? "border-primary bg-primary/5" : "border-[hsl(0_0%_10%)] hover:border-primary/50"
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{p.name}</span>
                  {client.program_id === p.id && <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.weeks} أسابيع</p>
              </button>
            )) : (
              <div className="text-center py-6 text-muted-foreground">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                <p className="text-sm">لا توجد برامج متاحة</p>
                <Link to="/programs"><Button variant="outline" size="sm" className="mt-2">إنشاء برنامج</Button></Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  );
};

export default ClientProfile;
