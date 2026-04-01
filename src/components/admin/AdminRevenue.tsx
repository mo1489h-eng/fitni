import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminPageProps } from "./types";

export function AdminRevenue({ data, month, onMonthChange }: AdminPageProps) {
  const stats = data?.stats;
  const charts = data?.charts || {};
  const trainers: any[] = data?.trainers || [];

  const totalRevenue = stats?.total_revenue || 0;
  const monthRevenue = stats?.month_revenue || 0;

  const planDist = charts.plan_distribution || {};
  const basicCount = planDist.basic || 0;
  const proCount = planDist.pro || 0;

  const basicRevenue = basicCount * 99;
  const proRevenue = proCount * 179;

  // Founders who used discount
  const founderDiscountTrainers = trainers.filter((t: any) => t.is_founder && t.founder_discount_used).length;
  const founderRevenue = founderDiscountTrainers * 99;

  const revenueChartData = Object.entries(charts.monthly_revenue || {}).map(([k, v]) => ({
    month: k,
    label: k.substring(5),
    revenue: v as number,
  }));

  const monthOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ar-SA", { year: "numeric", month: "long" });
      opts.push({ val, label });
    }
    return opts;
  };

  const exportCSV = () => {
    const csv = "الشهر,الإيراد\n" +
      revenueChartData.map(d => `${d.month},${d.revenue}`).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revenue_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">الإيرادات</h1>
        <div className="flex items-center gap-3">
          <Select value={month} onValueChange={onMonthChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions().map((o) => (
                <SelectItem key={o.val} value={o.val}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            تصدير
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: "إجمالي الإيرادات", v: `${totalRevenue.toLocaleString()} ريال`, c: "text-primary" },
          { l: `أساسي (99 ريال)`, v: `${basicCount} مدرب = ${basicRevenue.toLocaleString()} ريال`, c: "text-foreground" },
          { l: `احترافي (179 ريال)`, v: `${proCount} مدرب = ${proRevenue.toLocaleString()} ريال`, c: "text-foreground" },
          { l: `عرض المؤسسين (99 ريال)`, v: `${founderDiscountTrainers} = ${founderRevenue.toLocaleString()} ريال`, c: "text-amber-400" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <p className={`mt-2 text-lg font-bold ${s.c}`}>{s.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" strokeWidth={1.5} />
            الإيرادات الشهرية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value.toLocaleString()} ريال`, "الإيراد"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">تفاصيل شهرية</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الشهر</TableHead>
                <TableHead className="text-right">الإيراد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueChartData.map((d) => (
                <TableRow key={d.month}>
                  <TableCell>{d.month}</TableCell>
                  <TableCell className="font-semibold">{d.revenue.toLocaleString()} ريال</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
