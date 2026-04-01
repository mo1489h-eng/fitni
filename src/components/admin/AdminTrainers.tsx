import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminPageProps } from "./types";

type TrainerFilter = "all" | "active" | "trial" | "expired" | "founder";

export function AdminTrainers({ data, onAction, onRefresh }: AdminPageProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TrainerFilter>("all");
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);

  const trainers: any[] = data?.trainers || [];
  const now = new Date();

  const getStatus = (t: any) => {
    if (t.plan === "pro" || t.plan === "basic") {
      if (t.subscription_end_date && new Date(t.subscription_end_date) > now) return "active";
      return "expired";
    }
    return "trial";
  };

  const filtered = trainers.filter((t) => {
    if (search && !(t.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    const status = getStatus(t);
    if (filter === "active") return status === "active";
    if (filter === "trial") return status === "trial";
    if (filter === "expired") return status === "expired";
    if (filter === "founder") return t.is_founder;
    return true;
  });

  const statusBadge = (t: any) => {
    const status = getStatus(t);
    if (status === "active") return <Badge className="bg-primary/15 text-primary border-0">نشط</Badge>;
    if (status === "trial") return <Badge className="bg-blue-500/15 text-blue-400 border-0">تجربة</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-0">منتهي</Badge>;
  };

  const planBadge = (plan: string) => {
    if (plan === "pro") return <Badge className="bg-primary/15 text-primary border-0">احترافي</Badge>;
    if (plan === "basic") return <Badge className="bg-amber-500/15 text-amber-400 border-0">أساسي</Badge>;
    return <Badge variant="secondary">مجاني</Badge>;
  };

  const handleMarkPaid = async (payoutId: string) => {
    const result = await onAction("mark_payout_paid", { payout_id: payoutId });
    if (result?.success) {
      toast.success("تم التحويل");
      onRefresh();
    }
  };

  // Detail panel
  if (selectedTrainer) {
    const t = selectedTrainer;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTrainer(null)} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> العودة للقائمة
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {(t.name || "?")[0]}
              </div>
              <div>
                <div className="text-lg">{t.name || "بدون اسم"}</div>
                <div className="text-xs text-muted-foreground font-normal">{t.phone || "—"}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "الباقة", v: t.plan === "pro" ? "احترافي" : t.plan === "basic" ? "أساسي" : "مجاني" },
                { l: "العملاء", v: t.client_count },
                { l: "مبيعات الشهر", v: `${(t.month_sales || 0).toLocaleString()} ر.س` },
                { l: "إجمالي المبيعات", v: `${(t.total_sales || 0).toLocaleString()} ر.س` },
                { l: "تاريخ الاشتراك", v: t.subscribed_at ? new Date(t.subscribed_at).toLocaleDateString("ar-SA") : "—" },
                { l: "انتهاء الاشتراك", v: t.subscription_end_date ? new Date(t.subscription_end_date).toLocaleDateString("ar-SA") : "—" },
                { l: "مؤسس", v: t.is_founder ? "نعم" : "لا" },
                { l: "استخدم عرض المؤسس", v: t.founder_discount_used ? "نعم" : "لا" },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{item.l}</p>
                  <p className="font-semibold mt-1">{item.v}</p>
                </div>
              ))}
            </div>
            {t.iban && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">البيانات البنكية</p>
                <p className="text-sm font-mono">{t.iban}</p>
                <p className="text-xs text-muted-foreground">{t.bank_name} - {t.account_holder}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">المدربون</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مدرب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as TrainerFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="trial">تجربة</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="founder">مؤسس</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{filtered.length} مدرب</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المدرب</TableHead>
                <TableHead className="text-right">الباقة</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
                <TableHead className="text-right">عدد العملاء</TableHead>
                <TableHead className="text-right">مبيعات الشهر</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد نتائج</TableCell>
                </TableRow>
              )}
              {filtered.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/5" onClick={() => setSelectedTrainer(t)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {(t.name || "?")[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.name || "بدون اسم"}</p>
                        <p className="text-xs text-muted-foreground">{t.phone || ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{planBadge(t.plan || "free")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.subscribed_at ? new Date(t.subscribed_at).toLocaleDateString("ar-SA") : "—"}
                  </TableCell>
                  <TableCell>{t.client_count}</TableCell>
                  <TableCell className="text-sm">{(t.month_sales || 0).toLocaleString()} ر.س</TableCell>
                  <TableCell>{statusBadge(t)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedTrainer(t); }}>
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Requests */}
      {(data?.payouts || []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">طلبات السحب</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الآيبان</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.payouts || []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.account_holder_name || "—"}</TableCell>
                    <TableCell>{Number(p.amount).toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-xs font-mono">{p.iban}</TableCell>
                    <TableCell className="text-xs">{new Date(p.requested_at).toLocaleDateString("ar-SA")}</TableCell>
                    <TableCell>
                      {p.status === "paid"
                        ? <Badge className="bg-primary/15 text-primary border-0">مدفوع</Badge>
                        : <Badge variant="secondary">معلق</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p.id)}>تم التحويل</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
