import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AdminPageProps } from "./types";

export function AdminNPS({ data }: AdminPageProps) {
  const nps = data?.nps;
  if (!nps) return <p className="text-muted-foreground">لا توجد بيانات</p>;

  const scoreColor = nps.score >= 50 ? "text-primary" : nps.score >= 0 ? "text-amber-400" : "text-destructive";

  const exportCSV = () => {
    const csv = "Score,Comment,Date,Trainer\n" +
      (nps.recent || []).map((n: any) =>
        `${n.score},"${(n.comment || "").replace(/"/g, '""')}",${new Date(n.created_at).toLocaleDateString("ar-SA")},${n.trainer_name}`
      ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nps_feedback.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">تقييمات NPS</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          تصدير CSV
        </Button>
      </div>

      {/* NPS Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:row-span-2">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <p className="text-sm text-muted-foreground mb-2">NPS Score</p>
            <p className={`text-6xl font-extrabold ${scoreColor}`}>{nps.score}</p>
            <p className="text-xs text-muted-foreground mt-2">{nps.count} تقييم</p>
          </CardContent>
        </Card>

        {[
          { l: "المروّجون (9-10)", v: `${nps.promoters_pct}%`, c: "text-primary", bg: "bg-primary/10" },
          { l: "المحايدون (7-8)", v: `${nps.passives_pct}%`, c: "text-amber-400", bg: "bg-amber-500/10" },
          { l: "المنتقدون (0-6)", v: `${nps.detractors_pct}%`, c: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.l}</p>
              <div className="flex items-center gap-3 mt-2">
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                <div className={`flex-1 h-2 rounded-full ${s.bg} overflow-hidden`}>
                  <div className={`h-full rounded-full ${s.c === "text-primary" ? "bg-primary" : s.c === "text-amber-400" ? "bg-amber-400" : "bg-destructive"}`} style={{ width: s.v }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">آخر التقييمات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(nps.recent || []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد تقييمات</p>
          )}
          {(nps.recent || []).map((n: any) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                n.score >= 9 ? "bg-primary/15 text-primary" : n.score >= 7 ? "bg-amber-500/15 text-amber-400" : "bg-destructive/15 text-destructive"
              }`}>
                {n.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{n.trainer_name}</span>
                  <Badge variant="secondary" className="text-[10px]">{n.trigger_type || "—"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.comment || "بدون تعليق"}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(n.created_at).toLocaleDateString("ar-SA")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
