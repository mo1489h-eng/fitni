import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, AlertTriangle } from "lucide-react";
import { AdminPageProps } from "./types";

export function AdminFounders({ data }: AdminPageProps) {
  const founders = data?.founders;
  const trainers: any[] = (data?.trainers || []).filter((t: any) => t.is_founder);

  const total = founders?.total || 0;
  const spotsRemaining = founders?.spots_remaining || 0;
  const discountUsed = founders?.discount_used || 0;
  const discountRemaining = founders?.discount_remaining || 0;
  const avgClients = trainers.length > 0
    ? Math.round(trainers.reduce((s: number, t: any) => s + t.client_count, 0) / trainers.length)
    : 0;

  const exportCSV = () => {
    const csv = "الرقم,الاسم,تاريخ التسجيل,استخدم العرض,عدد العملاء\n" +
      trainers.map((t: any, i: number) =>
        `${i + 1},"${t.name || ""}",${t.subscribed_at ? new Date(t.subscribed_at).toLocaleDateString("ar-SA") : "—"},${t.founder_discount_used ? "نعم" : "لا"},${t.client_count}`
      ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "founders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">متابعة المؤسسين</h1>

      {/* Full banner */}
      {spotsRemaining === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-destructive">اكتملت أماكن المؤسسين</p>
            <p className="text-sm text-destructive/70">تم تعطيل عرض المؤسسين تلقائيا</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{total} من 100 مؤسس</span>
            <span className="text-sm font-bold text-primary">{total}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { l: "مؤسسون مسجلون", v: total, c: "text-primary" },
          { l: "أماكن متبقية", v: spotsRemaining, c: spotsRemaining > 0 ? "text-primary" : "text-destructive" },
          { l: "استخدموا العرض", v: discountUsed, c: "text-foreground" },
          { l: "لم يستخدموا بعد", v: discountRemaining, c: "text-amber-400" },
          { l: "متوسط عملاء المؤسس", v: avgClients, c: "text-foreground" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <p className={`mt-1 text-2xl font-bold ${s.c}`}>{s.v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">قائمة المؤسسين</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            تصدير CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-12">#</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-right">عدد العملاء</TableHead>
                <TableHead className="text-right">استخدم العرض</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا يوجد مؤسسون بعد</TableCell>
                </TableRow>
              )}
              {trainers.map((t: any, i: number) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{t.name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.subscribed_at ? new Date(t.subscribed_at).toLocaleDateString("ar-SA") : "—"}
                  </TableCell>
                  <TableCell>{t.client_count}</TableCell>
                  <TableCell>
                    {t.founder_discount_used
                      ? <Badge className="bg-primary/15 text-primary border-0">نعم</Badge>
                      : <Badge variant="secondary">لا</Badge>}
                  </TableCell>
                  <TableCell>
                    {t.plan === "pro" || t.plan === "basic"
                      ? <Badge className="bg-primary/15 text-primary border-0">مشترك</Badge>
                      : <Badge variant="secondary">تجربة</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
