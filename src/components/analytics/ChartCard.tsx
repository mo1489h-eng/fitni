import { ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportElementToPng } from "@/lib/analytics/exportChartPng";
import { useToast } from "@/hooks/use-toast";

export function ChartCard({
  title,
  description,
  children,
  empty,
  loading,
  fileName,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  empty?: boolean;
  loading?: boolean;
  fileName: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 md:p-5 ${className}`} dir="rtl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-[12px] text-muted-foreground">{description}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-border bg-muted/50 text-foreground hover:bg-muted"
          disabled={empty || loading || exporting}
          onClick={async () => {
            setExporting(true);
            const r = await exportElementToPng(ref.current, fileName);
            setExporting(false);
            if (r.ok) toast({ title: "تم تصدير الصورة" });
            else toast({ title: "تعذر التصدير", description: r.error, variant: "destructive" });
          }}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" strokeWidth={1.5} />}
          PNG
        </Button>
      </div>
      <div ref={ref} className="min-h-[220px]">
        {loading ? (
          <div className="analytics-shimmer min-h-[280px] w-full rounded-xl" aria-hidden />
        ) : empty ? (
          <p className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">لا توجد بيانات كافية</p>
        ) : (
          <div className="animate-in fade-in duration-500">{children}</div>
        )}
      </div>
    </div>
  );
}
