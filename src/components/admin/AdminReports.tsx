import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, CreditCard, UserX, DollarSign, Star, MessageSquare } from "lucide-react";
import { AdminPageProps } from "./types";

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminReports({ data }: AdminPageProps) {
  const trainers: any[] = data?.trainers || [];
  const nps = data?.nps;
  const now = new Date();

  const reports = [
    {
      title: "تقرير المدربين النشطين",
      icon: Users,
      action: () => {
        const active = trainers.filter(t => (t.plan === "pro" || t.plan === "basic") && t.subscription_end_date && new Date(t.subscription_end_date) > now);
        const csv = "الاسم,الباقة,عدد العملاء,المبيعات\n" +
          active.map(t => `"${t.name || ""}",${t.plan},${t.client_count},${t.total_sales}`).join("\n");
        downloadCSV("active_trainers.csv", csv);
      },
    },
    {
      title: "تقرير الاشتراكات المنتهية",
      icon: CreditCard,
      action: () => {
        const expired = trainers.filter(t => t.subscription_end_date && new Date(t.subscription_end_date) < now && t.plan !== "free");
        const csv = "الاسم,الباقة,تاريخ الانتهاء\n" +
          expired.map(t => `"${t.name || ""}",${t.plan},${t.subscription_end_date || ""}`).join("\n");
        downloadCSV("expired_subscriptions.csv", csv);
      },
    },
    {
      title: "تقرير المدربين الغائبين",
      icon: UserX,
      action: () => {
        const inactive = trainers.filter(t => t.client_count === 0);
        const csv = "الاسم,الباقة,تاريخ التسجيل\n" +
          inactive.map(t => `"${t.name || ""}",${t.plan || "free"},${t.subscribed_at || ""}`).join("\n");
        downloadCSV("inactive_trainers.csv", csv);
      },
    },
    {
      title: "تقرير إيرادات الشهر",
      icon: DollarSign,
      action: () => {
        const csv = "الاسم,مبيعات الشهر,إجمالي المبيعات,عمولة 10%\n" +
          trainers.filter(t => t.month_sales > 0).map(t =>
            `"${t.name || ""}",${t.month_sales},${t.total_sales},${Math.round(t.month_sales * 0.1)}`
          ).join("\n");
        downloadCSV("monthly_revenue.csv", csv);
      },
    },
    {
      title: "تقرير المؤسسين",
      icon: Star,
      action: () => {
        const founders = trainers.filter(t => t.is_founder);
        const csv = "الاسم,استخدم العرض,عدد العملاء,الباقة\n" +
          founders.map(t => `"${t.name || ""}",${t.founder_discount_used ? "نعم" : "لا"},${t.client_count},${t.plan || "free"}`).join("\n");
        downloadCSV("founders.csv", csv);
      },
    },
    {
      title: "تقرير NPS",
      icon: MessageSquare,
      action: () => {
        const csv = "التقييم,التعليق,التاريخ,المدرب\n" +
          (nps?.recent || []).map((n: any) =>
            `${n.score},"${(n.comment || "").replace(/"/g, '""')}",${new Date(n.created_at).toLocaleDateString("ar-SA")},${n.trainer_name}`
          ).join("\n");
        downloadCSV("nps_report.csv", csv);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">التقارير</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r, i) => (
          <Card key={i} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <r.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="font-medium text-sm">{r.title}</span>
              </div>
              <Button variant="outline" size="sm" onClick={r.action} className="w-full gap-2">
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                تصدير CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
