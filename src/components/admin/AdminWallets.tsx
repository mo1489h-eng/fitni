import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type WalletRow = Record<string, unknown> & {
  id: string;
  trainer_id: string;
  trainer_name?: string | null;
  balance_available?: number | null;
  pending_balance?: number | null;
  total_earnings?: number | null;
};

export function AdminWallets({
  wallets,
  walletTotals,
  loading,
}: {
  wallets: WalletRow[];
  walletTotals?: { bal: number; pend: number; earn: number };
  loading: boolean;
}) {
  const fmt = (n: unknown) =>
    new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(n ?? 0));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/60 bg-card/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">إجمالي الأرصدة</p>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-28" />
            ) : (
              <p className="text-2xl font-black text-primary tabular-nums">{fmt(walletTotals?.bal)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">إجمالي المعلق</p>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-28" />
            ) : (
              <p className="text-2xl font-black text-amber-500 tabular-nums">{fmt(walletTotals?.pend)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">إجمالي الأرباح</p>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-28" />
            ) : (
              <p className="text-2xl font-black text-sky-500 tabular-nums">{fmt(walletTotals?.earn)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المدرب</TableHead>
              <TableHead className="text-right">الرصيد</TableHead>
              <TableHead className="text-right">قيد الانتظار</TableHead>
              <TableHead className="text-right">إجمالي الأرباح</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : wallets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  لا توجد محافظ
                </TableCell>
              </TableRow>
            ) : (
              wallets.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.trainer_name ?? w.trainer_id}</TableCell>
                  <TableCell className="tabular-nums">{fmt(w.balance_available)}</TableCell>
                  <TableCell className="tabular-nums text-amber-600">{fmt(w.pending_balance)}</TableCell>
                  <TableCell className="tabular-nums text-sky-600">{fmt(w.total_earnings)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
