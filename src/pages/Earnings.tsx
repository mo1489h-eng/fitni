import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, Clock, TrendingUp, ArrowDownToLine, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const MIN_WITHDRAWAL = 200;
const PAGE_SIZE = 10;

const BANKS = [
  { value: "الراجحي", label: "الراجحي" },
  { value: "الأهلي", label: "الأهلي" },
  { value: "SNB", label: "SNB" },
  { value: "الرياض", label: "الرياض" },
  { value: "البلاد", label: "البلاد" },
  { value: "الإنماء", label: "الإنماء" },
  { value: "سامبا", label: "سامبا" },
  { value: "الفرنسي", label: "الفرنسي" },
] as const;

function formatMoney(n: number) {
  return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(n);
}

function saIbanValid(iban: string): boolean {
  const s = iban.replace(/\s/g, "").toUpperCase();
  return /^SA\d{22}$/.test(s);
}

const TYPE_META: Record<
  string,
  { label: string; className: string }
> = {
  subscription: { label: "اشتراك", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  program_sale: { label: "بيع برنامج", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  withdrawal: { label: "سحب", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  reward: { label: "مكافأة", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "مكتمل", className: "bg-emerald-500/15 text-emerald-400" },
  pending: { label: "معلق", className: "bg-amber-500/15 text-amber-400" },
  rejected: { label: "مرفوض", className: "bg-red-500/15 text-red-400" },
};

type TxRow = Tables<"transactions">;

export default function Earnings() {
  usePageTitle("الأرباح");
  useRegisterTrainerShell({ title: "الأرباح" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({
    amount: "",
    iban: "",
    bankName: "",
    accountHolder: "",
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("trainer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const balance = Number(wallet?.balance_available ?? 0);
  const pendingBal = Number(wallet?.pending_balance ?? 0);
  const totalEarn = Number(wallet?.total_earnings ?? 0);

  const { data: pendingWithdrawals = [], isLoading: pendWLoading } = useQuery({
    queryKey: ["withdrawals-pending", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("trainer_id", user!.id)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const pendingWithdrawal = pendingWithdrawals[0] ?? null;

  const { data: txCount = 0 } = useQuery({
    queryKey: ["transactions-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", user?.id, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as TxRow[];
    },
    enabled: !!user?.id,
  });

  const totalPages = Math.max(1, Math.ceil(txCount / PAGE_SIZE));

  const requestMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(form.amount);
      if (!Number.isFinite(amt) || amt < MIN_WITHDRAWAL) {
        throw new Error(`الحد الأدنى للسحب ${MIN_WITHDRAWAL} ريال`);
      }
      if (amt > balance) throw new Error("المبلغ أكبر من الرصيد المتاح");
      const iban = form.iban.replace(/\s/g, "").toUpperCase();
      if (!saIbanValid(iban)) throw new Error("رقم الآيبان يجب أن يكون بصيغة SA متبوعاً بـ 22 رقماً");
      if (!form.bankName.trim()) throw new Error("اختر البنك");
      if (!form.accountHolder.trim()) throw new Error("أدخل اسم صاحب الحساب");

      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_amount: amt,
        p_iban: iban,
        p_bank_name: form.bankName.trim(),
        p_account_holder_name: form.accountHolder.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب السحب");
      setSheetOpen(false);
      setForm({ amount: "", iban: "", bankName: "", accountHolder: "" });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-pending"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message || "فشل الطلب"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("cancel_withdrawal", { p_withdrawal_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الطلب");
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-pending"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذر الإلغاء"),
  });

  const showWithdrawCta = balance >= MIN_WITHDRAWAL && !pendingWithdrawal;

  const typeBadge = (t: string) => {
    const m = TYPE_META[t] ?? { label: t, className: "bg-muted text-muted-foreground" };
    return <Badge className={`text-[10px] border ${m.className}`}>{m.label}</Badge>;
  };

  const statusBadge = (s: string) => {
    const m = STATUS_META[s] ?? { label: s, className: "bg-muted text-muted-foreground" };
    return <Badge className={`text-[10px] ${m.className}`}>{m.label}</Badge>;
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#0A0A0A] text-foreground" dir="rtl">
      <div className="mx-auto max-w-5xl space-y-8 px-2 pb-12 pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">الأرباح والسحب</h1>
          <p className="mt-1 text-sm text-white/45">رصيدك، طلبات السحب، وسجل العمليات</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 shadow-xl">
            <div className="flex items-center gap-2 text-white/50">
              <Wallet className="h-5 w-5 text-[#22C55E]" strokeWidth={1.5} />
              <span className="text-sm">الرصيد المتاح</span>
            </div>
            {walletLoading ? (
              <Skeleton className="mt-4 h-12 w-40 bg-white/10" />
            ) : (
              <p className="mt-3 text-[48px] font-black leading-none text-[#22C55E] tabular-nums">
                {formatMoney(balance)}
                <span className="mr-2 text-lg font-bold text-white/50">ريال</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 shadow-xl">
            <div className="flex items-center gap-2 text-white/50">
              <Clock className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
              <span className="text-sm">قيد الانتظار</span>
            </div>
            {walletLoading ? (
              <Skeleton className="mt-4 h-12 w-32 bg-white/10" />
            ) : (
              <p className="mt-3 text-4xl font-black text-amber-400 tabular-nums">
                {formatMoney(pendingBal)} <span className="text-base font-bold text-white/40">ريال</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#111111] p-6 shadow-xl">
            <div className="flex items-center gap-2 text-white/50">
              <TrendingUp className="h-5 w-5 text-sky-400" strokeWidth={1.5} />
              <span className="text-sm">إجمالي الأرباح</span>
            </div>
            {walletLoading ? (
              <Skeleton className="mt-4 h-12 w-36 bg-white/10" />
            ) : (
              <p className="mt-3 text-4xl font-black text-sky-400 tabular-nums">
                {formatMoney(totalEarn)} <span className="text-base font-bold text-white/40">ريال</span>
              </p>
            )}
          </div>
        </div>

        {/* Withdraw CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {showWithdrawCta ? (
            <Button
              className="gap-2 rounded-xl bg-[#22C55E] font-bold text-black hover:bg-[#16a34a]"
              onClick={() => setSheetOpen(true)}
            >
              <ArrowDownToLine className="h-4 w-4" strokeWidth={2} />
              طلب سحب
            </Button>
          ) : (
            <p className="text-sm text-white/45">
              {!pendingWithdrawal && balance < MIN_WITHDRAWAL
                ? `الحد الأدنى للسحب ${MIN_WITHDRAWAL} ريال`
                : null}
              {pendingWithdrawal ? "لديك طلب سحب قيد المعالجة." : null}
            </p>
          )}
        </div>

        {/* Active withdrawal */}
        {(pendWLoading || pendingWithdrawal) && (
          <div className="rounded-2xl border border-amber-500/25 bg-[#111111] p-5">
            <h3 className="mb-3 text-sm font-bold text-amber-400">طلب سحب نشط</h3>
            {pendWLoading ? (
              <Skeleton className="h-24 w-full bg-white/10" />
            ) : pendingWithdrawal ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-2xl font-black text-white tabular-nums">
                    {formatMoney(Number(pendingWithdrawal.amount))}{" "}
                    <span className="text-sm text-white/45">ريال</span>
                  </span>
                  <Badge className="border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    {pendingWithdrawal.status === "pending" ? "معلق" : pendingWithdrawal.status === "accepted" ? "مقبول" : pendingWithdrawal.status}
                  </Badge>
                </div>
                <ol className="relative me-4 border-s border-white/10 ps-6 text-sm text-white/55">
                  <li className="mb-2">تم استلام الطلب</li>
                  <li className="mb-2">مراجعة الإدارة</li>
                  <li>تحويل المبلغ لحسابك</li>
                </ol>
                {pendingWithdrawal.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(pendingWithdrawal.id)}
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    إلغاء الطلب
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Transactions */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111111] overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-base font-bold text-white">سجل العمليات</h2>
          </div>
          {txLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-right text-white/55">التاريخ</TableHead>
                    <TableHead className="text-right text-white/55">النوع</TableHead>
                    <TableHead className="text-right text-white/55">المبلغ</TableHead>
                    <TableHead className="text-right text-white/55">العمولة</TableHead>
                    <TableHead className="text-right text-white/55">الصافي</TableHead>
                    <TableHead className="text-right text-white/55">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-white/40 py-10">
                        لا توجد عمليات بعد
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-white/[0.06]">
                        <TableCell className="text-white/80 text-xs">
                          {new Date(tx.created_at).toLocaleString("ar-SA")}
                        </TableCell>
                        <TableCell>{typeBadge(tx.type)}</TableCell>
                        <TableCell className="tabular-nums text-white">
                          {formatMoney(Number(tx.amount))}
                        </TableCell>
                        <TableCell className="tabular-nums text-white/60">
                          {tx.commission != null ? formatMoney(Number(tx.commission)) : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-[#22C55E]">
                          {tx.net_amount != null ? formatMoney(Number(tx.net_amount)) : "—"}
                        </TableCell>
                        <TableCell>{statusBadge(tx.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {txCount > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    السابق
                  </Button>
                  <span className="text-xs text-white/45">
                    صفحة {page + 1} من {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#111111] text-right" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-white">طلب سحب</SheetTitle>
            <SheetDescription className="text-white/50">
              أدخل بيانات الحساب البنكي بدقة. الحد الأدنى {MIN_WITHDRAWAL} ريال.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div>
              <Label className="text-white/70">المبلغ (ريال)</Label>
              <Input
                type="number"
                min={MIN_WITHDRAWAL}
                max={balance}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 border-white/10 bg-[#0A0A0A] text-white"
                placeholder={`من ${MIN_WITHDRAWAL} إلى ${formatMoney(balance)}`}
              />
            </div>
            <div>
              <Label className="text-white/70">الآيبان (SA + 22 رقماً)</Label>
              <Input
                value={form.iban}
                onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
                className="mt-1 border-white/10 bg-[#0A0A0A] text-white font-mono"
                placeholder="SA00..."
              />
            </div>
            <div>
              <Label className="text-white/70">البنك</Label>
              <Select
                value={form.bankName}
                onValueChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
              >
                <SelectTrigger className="mt-1 border-white/10 bg-[#0A0A0A] text-white">
                  <SelectValue placeholder="اختر البنك" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">اسم صاحب الحساب</Label>
              <Input
                value={form.accountHolder}
                onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                className="mt-1 border-white/10 bg-[#0A0A0A] text-white"
              />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:justify-start">
            <Button
              className="bg-[#22C55E] font-bold text-black hover:bg-[#16a34a]"
              disabled={requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
            >
              {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
            </Button>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              إلغاء
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
