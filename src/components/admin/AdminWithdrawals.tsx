import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

type WithdrawalRow = Record<string, unknown> & {
  id: string;
  trainer_id: string;
  trainer_name?: string | null;
  trainer_email?: string | null;
  amount: number;
  iban: string;
  account_holder_name: string;
  bank_name: string;
  status: string;
  created_at: string;
  admin_notes?: string | null;
};

type FilterTab = "all" | "pending" | "accepted" | "paid" | "rejected";

const STATUS_AR: Record<string, string> = {
  pending: "معلق",
  accepted: "مقبول",
  paid: "مدفوع",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export function AdminWithdrawals({
  withdrawals,
  loading,
  onProcess,
  onRefresh,
}: {
  withdrawals: WithdrawalRow[];
  loading: boolean;
  onProcess: (id: string, action: "approve" | "reject" | "mark_paid", notes: string) => Promise<unknown>;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = withdrawals.filter((w) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

  const copyIban = (iban: string) => {
    void navigator.clipboard.writeText(iban.replace(/\s/g, ""));
    toast.success("تم نسخ الآيبان");
  };

  const run = async (id: string, action: "approve" | "reject" | "mark_paid") => {
    setBusyId(id);
    try {
      await onProcess(id, action, notesById[id] ?? "");
      toast.success("تم تنفيذ الإجراء");
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الإجراء");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList className="flex flex-wrap gap-1 bg-muted/30">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="pending">معلق</TabsTrigger>
          <TabsTrigger value="accepted">مقبول</TabsTrigger>
          <TabsTrigger value="paid">مدفوع</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المدرب</TableHead>
              <TableHead className="text-right">الإيميل</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الآيبان</TableHead>
              <TableHead className="text-right">صاحب الحساب</TableHead>
              <TableHead className="text-right">البنك</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right w-[200px]">ملاحظات</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  لا توجد طلبات
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.trainer_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                    {w.trainer_email ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{Number(w.amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 max-w-[220px]">
                      <span className="font-mono text-[11px] truncate" title={String(w.iban)}>
                        {w.iban}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyIban(String(w.iban))}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{w.account_holder_name}</TableCell>
                  <TableCell className="text-sm">{w.bank_name}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(w.created_at).toLocaleString("ar-SA")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {STATUS_AR[w.status] ?? w.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={notesById[w.id] ?? ""}
                      onChange={(e) => setNotesById((m) => ({ ...m, [w.id]: e.target.value }))}
                      placeholder="ملاحظات الإدارة"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {w.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-emerald-600 border-emerald-500/40"
                            disabled={busyId === w.id}
                            onClick={() => void run(w.id, "approve")}
                          >
                            {busyId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span aria-hidden>✅</span>}
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-500/40"
                            disabled={busyId === w.id}
                            onClick={() => void run(w.id, "reject")}
                          >
                            <span aria-hidden>❌</span>
                            رفض
                          </Button>
                        </>
                      )}
                      {w.status === "accepted" && (
                        <Button
                          size="sm"
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={busyId === w.id}
                          onClick={() => void run(w.id, "mark_paid")}
                        >
                          {busyId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span aria-hidden>✅</span>}
                          تأكيد الدفع
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
