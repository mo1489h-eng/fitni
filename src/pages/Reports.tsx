import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import TrialBanner from "@/components/TrialBanner";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Users, TrendingDown, TrendingUp, Minus, Activity,
  DollarSign, AlertTriangle, Loader2, Send, MessageCircle,
  CheckCircle, XCircle, Clock, Lock, FileText, Download, BarChart2,
} from "lucide-react";

const Reports = () => {
  usePageTitle("التقارير");
  useRegisterTrainerShell({ title: "التقارير" });
  const { user, profile } = useAuth();
  const { hasReportsAccess, plan } = usePlanLimits();
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const { toast } = useToast();

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["report-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: measurements = [], isLoading: loadingMeasurements } = useQuery({
    queryKey: ["report-measurements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements").select("*").order("recorded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = loadingClients || loadingMeasurements;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;

  const getClientReport = (client: typeof clients[0]) => {
    const clientMeasurements = measurements.filter((m) => m.client_id === client.id);
    const recentMeasurements = clientMeasurements.filter((m) => new Date(m.recorded_at).getTime() >= oneWeekAgo);
    const sorted = clientMeasurements.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    const latestWeight = sorted[0]?.weight || 0;
    const previousWeight = sorted[1]?.weight || latestWeight;
    const weightChange = latestWeight - previousWeight;
    const lastWorkoutDays = Math.ceil((now - new Date(client.last_workout_date).getTime()) / 86400000);
    const subEndDate = new Date(client.subscription_end_date).getTime();
    const isPaid = subEndDate >= now;
    const daysLeft = Math.ceil((subEndDate - now) / 86400000);
    const weeklyTarget = 5;
    const weeklyDone = recentMeasurements.length > weeklyTarget ? weeklyTarget : recentMeasurements.length;
    return { weightChange, latestWeight, lastWorkoutDays, isPaid, daysLeft, weeklyDone, weeklyTarget };
  };

  const activeClients = clients.filter((c) => Math.ceil((new Date(c.subscription_end_date).getTime() - now) / 86400000) >= 0);
  const overdueClients = clients.filter((c) => Math.ceil((new Date(c.subscription_end_date).getTime() - now) / 86400000) < 0);
  const monthlyRevenue = clients.reduce((sum, c) => sum + (c.subscription_price || 0), 0);
  const avgCommitment = clients.length > 0
    ? Math.round(clients.reduce((sum, c) => { const r = getClientReport(c); return sum + (r.weeklyDone / r.weeklyTarget) * 100; }, 0) / clients.length)
    : 0;

  const formatWhatsApp = (phone: string, message: string) =>
    `https://wa.me/966${phone.replace(/^0/, "")}?text=${encodeURIComponent(message)}`;

  const getWhatsAppMessage = (client: typeof clients[0]) => {
    const r = getClientReport(client);
    const weightStr = r.latestWeight > 0 ? `${r.latestWeight}kg` : "—";
    return `أهلاً ${client.name}\n\nتقريرك الأسبوعي:\n\nالتمارين: ${r.weeklyDone}/${r.weeklyTarget}\nالوزن: ${weightStr}\n\nاستمر!`;
  };

  const handleSendAll = () => {
    clients.forEach((client, index) => {
      setTimeout(() => {
        setSendingIndex(index);
        window.open(formatWhatsApp(client.phone, getWhatsAppMessage(client)), "_blank");
        if (index === clients.length - 1) setTimeout(() => setSendingIndex(null), 1000);
      }, index * 1500);
    });
  };

  const generateClientPdf = (client: typeof clients[0]) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica");
    const pageWidth = 210;
    const margin = 20;
    let y = 20;
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("CoachBase", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("Monthly Client Report", pageWidth / 2, 25, { align: "center" });
    y = 45;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.text(`Client: ${client.name}`, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const nowDate = new Date();
    doc.text(`Report: ${nowDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, margin, y);
    if (profile?.full_name) doc.text(`Trainer: ${profile.full_name}`, pageWidth - margin, y, { align: "right" });
    y += 10;
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    const r = getClientReport(client);
    const stats = [
      { label: "Week", value: `${client.week_number}` },
      { label: "Last Workout", value: `${r.lastWorkoutDays}d ago` },
      { label: "Payment", value: r.isPaid ? "Paid" : "Overdue" },
      { label: "Days Left", value: `${r.daysLeft}` },
    ];
    const boxWidth = (pageWidth - 2 * margin - 15) / 4;
    stats.forEach((stat, i) => {
      const x = margin + i * (boxWidth + 5);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(x, y, boxWidth, 25, 3, 3, "F");
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74);
      doc.text(stat.value, x + boxWidth / 2, y + 10, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(stat.label, x + boxWidth / 2, y + 18, { align: "center" });
    });
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 282, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by CoachBase", pageWidth / 2, 289, { align: "center" });
    return doc.output("arraybuffer");
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const zip = new JSZip();
      clients.forEach((client) => zip.file(`${client.name}_report.pdf`, generateClientPdf(client)));
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `client_reports_${new Date().toISOString().slice(0, 7)}.zip`);
      toast({ title: "تم تحميل جميع التقارير" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingAll(false);
    }
  };

  const summaryStats = [
    { label: "العملاء النشطين", value: activeClients.length, icon: Users, color: "text-primary" },
    { label: "متوسط الالتزام", value: `${avgCommitment}%`, icon: Activity, color: "text-primary" },
    { label: "إيرادات الشهر", value: `${monthlyRevenue.toLocaleString()} ر.س`, icon: DollarSign, color: "text-primary" },
    { label: "متأخرين بالدفع", value: overdueClients.length, icon: AlertTriangle, color: "text-destructive" },
  ];

  if (!hasReportsAccess) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-warning" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-foreground">التقارير المتقدمة</h2>
          <p className="text-muted-foreground text-sm max-w-xs">التقارير المتقدمة متاحة في الباقة الاحترافية</p>
          <Button onClick={() => setShowPlans(true)}>ترقية الآن</Button>
          <TrialBanner showPlans={showPlans} onShowPlansChange={setShowPlans} />
        </div>
    );
  }

  return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent border-[hsl(0_0%_10%)]" onClick={handleDownloadAll} disabled={clients.length === 0 || downloadingAll}>
              {downloadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={1.5} />}
              تحميل الكل PDF
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSendAll} disabled={clients.length === 0 || sendingIndex !== null}>
              <Send className="w-4 h-4" strokeWidth={1.5} />إرسال للكل
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryStats.map((stat) => (
                <div key={stat.label} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] border-t-2 border-t-primary p-4 space-y-2">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(0_0%_10%)] flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-bold text-foreground">تقرير العملاء</h2>
            <div className="space-y-3">
              {clients.map((client, index) => {
                const r = getClientReport(client);
                const WeightIcon = r.weightChange < 0 ? TrendingDown : r.weightChange > 0 ? TrendingUp : Minus;
                const weightColor = r.weightChange < 0 ? "text-emerald-400" : r.weightChange > 0 ? "text-destructive" : "text-muted-foreground";

                return (
                  <div key={client.id} className="bg-[hsl(0_0%_6%)] rounded-xl border border-[hsl(0_0%_10%)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground">{client.name}</h3>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300" onClick={() => window.open(formatWhatsApp(client.phone, getWhatsAppMessage(client)), "_blank")}>
                        <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-muted-foreground">الالتزام</p>
                          <p className="font-semibold text-foreground">{r.weeklyDone}/{r.weeklyTarget} تمارين</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <WeightIcon className={`w-4 h-4 flex-shrink-0 ${weightColor}`} strokeWidth={1.5} />
                        <div>
                          <p className="text-muted-foreground">تغير الوزن</p>
                          <p className={`font-semibold ${weightColor}`}>
                            {r.weightChange === 0 ? "ثابت" : `${r.weightChange > 0 ? "+" : ""}${r.weightChange.toFixed(1)}kg`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-muted-foreground">آخر تسجيل</p>
                          <p className="font-semibold text-foreground">{r.lastWorkoutDays === 0 ? "اليوم" : `منذ ${r.lastWorkoutDays} يوم`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.isPaid ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" strokeWidth={1.5} /> : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" strokeWidth={1.5} />}
                        <div>
                          <p className="text-muted-foreground">حالة الدفع</p>
                          <p className={`font-semibold ${r.isPaid ? "text-emerald-400" : "text-destructive"}`}>{r.isPaid ? "مدفوع" : "متأخر"}</p>
                        </div>
                      </div>
                    </div>
                    {sendingIndex === index && (
                      <div className="text-xs text-primary text-center animate-pulse">جاري إرسال التقرير...</div>
                    )}
                  </div>
                );
              })}
              {clients.length === 0 && (
                <div className="text-center py-16 space-y-3">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
                  <p className="text-muted-foreground">لا يوجد عملاء بعد</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
  );
};

export default Reports;
