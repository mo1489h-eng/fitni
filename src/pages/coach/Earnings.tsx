import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRegisterTrainerShell } from "@/contexts/trainerShellContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkVerification } from "@/lib/auth-verification";
import {
  useTrainerWallet,
  useTrainerTransactionCount,
  useTrainerTransactionsPage,
  useTrainerActiveWithdrawals,
  useTrainerWithdrawalsHistory,
} from "@/hooks/useTrainerFinance";
import type { TransactionRow } from "@/hooks/useTrainerFinance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDownToLine, XCircle, Loader2, Info, Wallet, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

const MIN_WITHDRAWAL = 100;
const PAGE_SIZE = 10;

type RequestWithdrawalArgs = Database["public"]["Functions"]["request_withdrawal"]["Args"];

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

const TYPE_META: Record<string, { label: string; className: string }> = {
  subscription: { label: "اشتراك", className: "bg-primary/15 text-primary border-primary/30" },
  program_sale: { label: "بيع برنامج", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  withdrawal: { label: "سحب", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  reward: { label: "مكافأة", className: "bg-accent-subtle text-accent border-accent/30" },
  bonus: { label: "مكافأة", className: "bg-accent-subtle text-accent border-accent/30" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "مكتمل", className: "bg-primary/15 text-primary" },
  complete: { label: "مكتمل", className: "bg-primary/15 text-primary" },
  pending: { label: "معلق", className: "bg-amber-500/15 text-amber-400" },
  accepted: { label: "قيد المعالجة", className: "bg-sky-500/15 text-sky-400" },
  failed: { label: "فشل", className: "bg-red-500/15 text-red-400" },
  rejected: { label: "مرفوض", className: "bg-red-500/15 text-red-400" },
  cancelled: { label: "ملغى", className: "bg-muted text-muted-foreground" },
};

function walletAvailableBalance(
  wallet: { balance?: number | null; balance_available?: number | null } | null,
): number {
  if (!wallet) return 0;
  return Number(wallet.balance ?? wallet.balance_available ?? 0);
}

type TxWithCommission = TransactionRow & {
  gross_amount?: number | null;
  commission_amount?: number | null;
  commission_rate?: number | null;
  commission?: number | null;
  net_amount?: number | null;
};

function txAmounts(tx: TxWithCommission): { gross: number; commission: number; net: number } {
  const hasGross = tx.gross_amount != null && Number(tx.gross_amount) > 0;
  const gross = hasGross ? Number(tx.gross_amount) : Number(tx.amount);
  const commission =
    tx.commission_amount != null
      ? Number(tx.commission_amount)
      : tx.commission != null
        ? Number(tx.commission)
        : 0;
  const net =
    tx.net_amount != null
      ? Number(tx.net_amount)
      : hasGross
        ? Number(tx.amount)
        : Math.max(0, Number(tx.amount) - commission);
  return { gross, commission, net };
}

/** Large hero amounts: number bright, currency sand, ريال after amount */
function MoneyLarge({ value }: { value: number }) {
  return (
    <>
      <span className="text-3xl font-bold tabular-nums text-foreground">{formatMoney(value)}</span>
      <span className="text-sm text-[#C2A878] ms-1">ريال</span>
    </>
  );
}

/** Table / list amounts */
function MoneySmall({ value }: { value: number }) {
  return (
    <>
      <span className="text-sm font-medium tabular-nums text-foreground">{formatMoney(value)}</span>
      <span className="text-xs text-[#C2A878] ms-1">ريال</span>
    </>
  );
}

function commissionRatePct(tx: TxWithCommission): number | null {
  if (tx.commission_rate == null) return null;
  const r = Number(tx.commission_rate);
  if (!Number.isFinite(r)) return null;
  return r <= 1 ? Math.round(r * 100) : Math.round(r);
}

function CommissionCell({ tx, commission }: { tx: TxWithCommission; commission: number }) {
  if (commission <= 0 && tx.commission_amount == null && tx.commission == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = commissionRatePct(tx);
  const label =
    pct != null ? `عمولة ${pct}% — ${formatMoney(commission)} ريال` : `عمولة — ${formatMoney(commission)} ريال`;
  return <span className="text-xs text-muted-foreground tabular-nums">{label}</span>;
}

function NetCell({ tx, net }: { tx: TxWithCommission; net: number }) {
  const isWithdrawal = tx.type === "withdrawal";
  const isDeduction = isWithdrawal || net < 0;
  const cls = isDeduction ? "text-[#B91C1C]" : "text-primary";
  const arrow = isDeduction ? "↓" : "↑";
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${cls}`}>
      <span aria-hidden>{arrow}</span>
      <span className="text-sm font-medium">{formatMoney(Math.abs(net))}</span>
      <span className="text-xs text-[#C2A878]">ريال</span>
    </span>
  );
}

function TxDescriptionRich({ tx }: { tx: TxWithCommission }) {
  if (tx.type !== "subscription" && tx.type !== "program_sale") {
    return <>{tx.description?.trim() || "—"}</>;
  }
  const { gross, commission, net } = txAmounts(tx);
  const pct = commissionRatePct(tx);
  const head = tx.type === "program_sale" ? "بيع برنامج" : "اشتراك";
  const commLabel =
    pct != null ? `عمولة ${pct}% — ${formatMoney(commission)} ريال` : `عمولة — ${formatMoney(commission)} ريال`;
  return (
    <span className="leading-relaxed">
      <span className="text-sm font-medium text-foreground">
        {head} {formatMoney(gross)}
      </span>
      <span className="text-xs text-[#C2A878] ms-1">ريال</span>
      <span className="text-xs text-muted-foreground"> — {commLabel} — </span>
      <span className="text-sm font-medium text-primary inline-flex items-center gap-0.5">
        <span aria-hidden>↑</span>
        صافي {formatMoney(net)}
      </span>
      <span className="text-xs text-[#C2A878] ms-1">ريال</span>
    </span>
  );
}

export default function Earnings() {
  usePageTitle("الأرباح");
  useRegisterTrainerShell({ title: "الأرباح" });
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({
    amount: "",
    iban: "",
    bankName: "",
    accountHolder: "",
  });

  const { data: wallet, isLoading: walletLoading } = useTrainerWallet(user?.id);
  const { data: pendingWithdrawals = [], isLoading: pendWLoading } = useTrainerActiveWithdrawals(user?.id);
  const { data: withdrawalsHistory = [], isLoading: histLoading } = useTrainerWithdrawalsHistory(user?.id);
  const { data: txCount = 0 } = useTrainerTransactionCount(user?.id);
  const { data: transactions = [], isLoading: txLoading } = useTrainerTransactionsPage(
    user?.id,
    page,
    PAGE_SIZE,
  );

  const balance = walletAvailableBalance(wallet);
  const pendingBal = Number(wallet?.pending_balance ?? 0);
  const totalEarn = Number(
    (wallet as { total_earned?: number | null; total_earnings?: number | null } | null)?.total_earned ??
      (wallet as { total_earnings?: number | null } | null)?.total_earnings ??
      0,
  );

  const pendingWithdrawal = pendingWithdrawals[0] ?? null;
  const totalPages = Math.max(1, Math.ceil(txCount / PAGE_SIZE));

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!checkVerification(profile)) {
        throw new Error("يجب تأكيد بريدك الإلكتروني قبل طلب السحب");
      }
      const amt = Number(form.amount);
      if (!Number.isFinite(amt) || amt < MIN_WITHDRAWAL) {
        throw new Error(`الحد الأدنى للسحب ${MIN_WITHDRAWAL} ريال`);
      }
      if (amt > balance) throw new Error("المبلغ أكبر من الرصيد المتاح");
      const iban = form.iban.replace(/\s/g, "").toUpperCase();
      if (!saIbanValid(iban)) throw new Error("رقم الآيبان يجب أن يكون SA متبوعاً بـ 22 رقماً (24 خانة)");
      if (!form.bankName.trim()) throw new Error("اختر البنك");
      if (!form.accountHolder.trim()) throw new Error("أدخل اسم صاحب الحساب");

      const payload: RequestWithdrawalArgs = {
        p_amount: amt,
        p_iban: iban,
        p_bank_name: form.bankName.trim(),
        p_account_holder_name: form.accountHolder.trim(),
      };

      const { error } = await supabase.rpc("request_withdrawal", payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        "تم إرسال طلب السحب بنجاح. سيتم التواصل معك خلال 3-5 أيام عمل لإتمام التحويل",
      );
      setDialogOpen(false);
      setForm({ amount: "", iban: "", bankName: "", accountHolder: "" });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-pending"] });
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-history"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions-count"] });
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
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-history"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message || "تعذر الإلغاء"),
  });

  const emailVerified = checkVerification(profile);
  const showWithdrawCta = balance >= MIN_WITHDRAWAL && !pendingWithdrawal && emailVerified;

  const typeBadge = (t: string) => {
    const m = TYPE_META[t] ?? { label: t, className: "bg-muted text-muted-foreground" };
    return <Badge className={`text-[10px] border ${m.className}`}>{m.label}</Badge>;
  };

  const statusBadge = (s: string) => {
    const m = STATUS_META[s] ?? { label: s, className: "bg-muted text-muted-foreground" };
    return <Badge className={`text-[10px] ${m.className}`}>{m.label}</Badge>;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-[calc(100vh-6rem)] bg-background text-foreground" dir="rtl">
        <div className="mx-auto max-w-5xl space-y-8 px-2 pb-12 pt-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">الأرباح</h1>
            <p className="mt-1 text-sm text-muted-foreground">الرصيد، طلبات السحب، وسجل العمليات</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-foreground">الرصيد المتاح</span>
                </div>
                {showWithdrawCta ? (
                  <Button
                    size="sm"
                    className="gap-1 rounded-lg bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
                    onClick={() => setDialogOpen(true)}
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={2} />
                    طلب سحب
                  </Button>
                ) : null}
              </div>
              {walletLoading ? (
                <Skeleton className="mt-4 h-12 w-40 bg-muted" />
              ) : (
                <p className="mt-3 leading-none">
                  <MoneyLarge value={balance} />
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 shrink-0 text-[#D97706]" aria-hidden />
                <span className="text-sm font-medium text-[#D97706]">قيد التحويل</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ms-1 text-muted-foreground hover:text-foreground"
                      aria-label="شرح الرصيد قيد التحويل"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-right text-sm">
                    يتوفر خلال 7 أيام من تاريخ الاشتراك
                  </TooltipContent>
                </Tooltip>
              </div>
              {walletLoading ? (
                <Skeleton className="mt-4 h-12 w-32 bg-muted" />
              ) : (
                <p className="mt-3 leading-none">
                  <MoneyLarge value={pendingBal} />
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm font-medium text-foreground inline-flex items-center gap-1">
                  <span className="text-primary" aria-hidden>
                    ↑
                  </span>
                  إجمالي الأرباح
                </span>
              </div>
              {walletLoading ? (
                <Skeleton className="mt-4 h-12 w-36 bg-muted" />
              ) : (
                <p className="mt-3 leading-none">
                  <MoneyLarge value={totalEarn} />
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!showWithdrawCta ? (
              <p className="text-sm text-muted-foreground">
                {!pendingWithdrawal && balance < MIN_WITHDRAWAL ? (
                  <>
                    الحد الأدنى لطلب السحب{" "}
                    <span className="text-sm font-medium text-foreground">{formatMoney(MIN_WITHDRAWAL)}</span>
                    <span className="text-xs text-[#C2A878] ms-1">ريال</span>
                  </>
                ) : null}
                {!pendingWithdrawal && balance >= MIN_WITHDRAWAL && !emailVerified
                  ? "أكّد بريدك الإلكتروني من لوحة الحساب لتمكين السحب."
                  : null}
                {pendingWithdrawal ? "لديك طلب سحب قيد المعالجة." : null}
              </p>
            ) : null}
          </div>

          {(pendWLoading || pendingWithdrawal) && (
            <div className="rounded-2xl border border-amber-500/25 bg-card p-5">
              <h3 className="mb-3 text-sm font-bold text-amber-400">طلب سحب نشط</h3>
              {pendWLoading ? (
                <Skeleton className="h-24 w-full bg-muted" />
              ) : pendingWithdrawal ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="leading-none">
                      <MoneyLarge value={Number(pendingWithdrawal.amount)} />
                    </p>
                    {statusBadge(pendingWithdrawal.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    البنك: {pendingWithdrawal.bank_name} — تاريخ الطلب:{" "}
                    {new Date(pendingWithdrawal.created_at).toLocaleString("ar-SA")}
                  </p>
                  <ol className="relative me-4 border-s border-border ps-6 text-sm text-muted-foreground">
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

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-base font-bold text-foreground">طلبات السحب</h2>
            </div>
            {histLoading ? (
              <div className="p-4">
                <Skeleton className="h-20 w-full bg-white/10" />
              </div>
            ) : withdrawalsHistory.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد طلبات سحب بعد</p>
            ) : (
              <ul className="divide-y divide-white/[0.06] px-4 py-2">
                {withdrawalsHistory.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="tabular-nums inline-flex items-baseline">
                      <MoneySmall value={Number(w.amount)} />
                    </span>
                    {statusBadge(w.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(w.created_at).toLocaleString("ar-SA")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-base font-bold text-foreground">سجل المعاملات</h2>
            </div>
            {txLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-right text-muted-foreground">النوع</TableHead>
                      <TableHead className="text-right text-muted-foreground">الوصف</TableHead>
                      <TableHead className="text-right text-muted-foreground">المبلغ الإجمالي</TableHead>
                      <TableHead className="text-right text-muted-foreground">العمولة</TableHead>
                      <TableHead className="text-right text-muted-foreground">صافي الربح</TableHead>
                      <TableHead className="text-right text-muted-foreground">التاريخ</TableHead>
                      <TableHead className="text-right text-muted-foreground">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          لا توجد معاملات بعد
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => {
                        const t = tx as TxWithCommission;
                        const { gross, commission, net } = txAmounts(t);
                        return (
                          <TableRow key={tx.id} className="border-border/60">
                            <TableCell>{typeBadge(tx.type)}</TableCell>
                            <TableCell className="max-w-[260px] leading-relaxed">
                              {t.type === "subscription" || t.type === "program_sale" ? (
                                <TxDescriptionRich tx={t} />
                              ) : (
                                <span className="text-sm text-foreground">{t.description?.trim() || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <MoneySmall value={gross} />
                            </TableCell>
                            <TableCell>
                              <CommissionCell tx={t} commission={commission} />
                            </TableCell>
                            <TableCell>
                              <NetCell tx={t} net={net} />
                            </TableCell>
                            <TableCell className="text-foreground/80 text-xs">
                              {new Date(tx.created_at).toLocaleString("ar-SA")}
                            </TableCell>
                            <TableCell>{statusBadge(tx.status)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      السابق
                    </Button>
                    <span className="text-xs text-muted-foreground">
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            className="max-w-md border-border bg-card text-right sm:rounded-2xl"
            dir="rtl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">طلب سحب</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                أدخل بيانات الحساب البنكي بدقة. الحد الأدنى للسحب{" "}
                <span className="font-medium text-foreground">{formatMoney(MIN_WITHDRAWAL)}</span>
                <span className="text-xs text-[#C2A878] ms-1">ريال</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground">الحد الأقصى المتاح للسحب</p>
              <p className="mt-1 leading-none">
                <MoneyLarge value={balance} />
              </p>
            </div>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="text-muted-foreground">المبلغ (ريال)</Label>
                <Input
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={balance}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-1 border-border bg-background text-foreground"
                  placeholder={`من ${MIN_WITHDRAWAL} إلى ${formatMoney(balance)}`}
                />
              </div>
              <div>
                <Label className="text-muted-foreground">الآيبان (SA + 22 رقماً)</Label>
                <Input
                  value={form.iban}
                  onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
                  className="mt-1 border-border bg-background text-foreground font-mono"
                  placeholder="SA00..."
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">البنك</Label>
                <Select value={form.bankName} onValueChange={(v) => setForm((f) => ({ ...f, bankName: v }))}>
                  <SelectTrigger className="mt-1 border-border bg-background text-foreground">
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
                <Label className="text-muted-foreground">اسم صاحب الحساب</Label>
                <Input
                  value={form.accountHolder}
                  onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
                  className="mt-1 border-border bg-background text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-start flex-row-reverse">
              <Button
                className="bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
                disabled={requestMutation.isPending}
                onClick={() => requestMutation.mutate()}
              >
                {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
              </Button>
              <Button variant="ghost" className="text-muted-foreground" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
