import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { AdminPageProps } from "./types";

export function AdminPlans({ data }: AdminPageProps) {
  const founders = data?.founders;
  const charts = data?.charts || {};
  const planDist = charts.plan_distribution || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الباقات والأسعار</h1>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>الباقة الأساسية</span>
              <Badge className="bg-amber-500/15 text-amber-400 border-0">أساسي</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold text-foreground">99 <span className="text-sm font-normal text-muted-foreground">ريال/شهر</span></p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>حتى 20 عميلاً</p>
              <p>جميع الميزات متاحة</p>
              <p>دعم فني</p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">عدد المشتركين الحاليين: <span className="font-bold text-foreground">{planDist.basic || 0}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>الباقة الاحترافية</span>
              <Badge className="bg-primary/15 text-primary border-0">احترافي</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold text-primary">179 <span className="text-sm font-normal text-muted-foreground">ريال/شهر</span></p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>عملاء غير محدودين</p>
              <p>جميع الميزات متاحة</p>
              <p>AI Copilot</p>
              <p>سوق البرامج</p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">عدد المشتركين الحاليين: <span className="font-bold text-foreground">{planDist.pro || 0}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Founders Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">عرض المؤسسين</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">الحالة</p>
              <p className="mt-1 font-bold">{(founders?.spots_remaining || 0) > 0 ? <span className="text-primary">نشط</span> : <span className="text-destructive">منتهي</span>}</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">الخصم</p>
              <p className="mt-1 font-bold">الاحترافية بـ 99 ريال</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">الأماكن المتبقية</p>
              <p className="mt-1 font-bold">{founders?.spots_remaining || 0} من 100</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">استخدموا العرض</p>
              <p className="mt-1 font-bold">{founders?.discount_used || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">إعدادات التجربة المجانية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <div>
              <p className="font-medium">مدة التجربة المجانية</p>
              <p className="text-sm text-muted-foreground">3 شهور (91 يوم)</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs text-amber-400">تغيير السعر سيؤثر على المشتركين الجدد فقط. المشتركون الحاليون يبقون على أسعارهم.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
