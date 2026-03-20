import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, CirclePlay, CreditCard, Users, WalletCards, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal, DeviceShell, MiniStat } from "./LandingUtils";

const DashboardMockup = ({ parallax = 0 }: { parallax?: number }) => (
  <div className="relative mx-auto max-w-5xl">
    <div className="absolute inset-x-10 bottom-0 h-28 rounded-full bg-primary/20 blur-3xl" />
    <DeviceShell className="relative landing-float">
      <div
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_30%)]"
        style={{ transform: `translate3d(0, ${parallax}px, 0)` }}
      >
        <div className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
          <div className="text-sm font-medium text-foreground/55">لوحة تحكم fitni</div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">مباشر الآن</div>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <MiniStat label="العملاء النشطون" value="128" />
              <MiniStat label="الاشتراكات" value="92%" />
              <MiniStat label="المهام اليوم" value="14" />
            </div>
            <Card className="overflow-hidden border-border bg-card/80">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <div className="text-lg font-bold text-foreground">أداء الأسبوع</div>
                    <div className="text-sm text-foreground/50">نشاط العملاء والمدفوعات</div>
                  </div>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="grid h-56 grid-cols-12 items-end gap-2 px-5 pb-5 pt-8">
                  {[28, 46, 35, 62, 54, 70, 82, 66, 88, 76, 92, 98].map((height, index) => (
                    <div key={index} className="flex h-full items-end">
                      <div className="w-full rounded-t-full bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--primary)/0.18))]" style={{ height: `${height}%` }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="border-border bg-card/85">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">العملاء</div>
                    <div className="text-sm text-foreground/50">أحدث التحديثات</div>
                  </div>
                  <Users className="h-5 w-5 text-primary" />
                </div>
                {[
                  { name: "سارة", status: "أكملت التمرين" },
                  { name: "تركي", status: "رفع قياسات جديدة" },
                  { name: "لولوة", status: "دفع الاشتراك" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-sm text-foreground/50">{item.status}</div>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border bg-card/85">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">الإيراد الشهري</div>
                    <div className="text-sm text-foreground/50">محصل تلقائياً</div>
                  </div>
                  <WalletCards className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-black text-foreground">18,420 ر.س</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full w-[78%] rounded-full bg-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DeviceShell>
  </div>
);

const HeroSection = ({ heroParallax }: { heroParallax: number }) => (
  <section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-28 md:px-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_88%,hsl(var(--primary)/0.2),transparent_28%),radial-gradient(circle_at_top,hsl(var(--foreground)/0.04),transparent_35%)]" />
    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:96px_96px]" />
    <div className="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <Reveal className="max-w-3xl">
        <Badge className="mb-6 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
          المنصة الأولى للمدربين الشخصيين في السعودية
        </Badge>
        <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-foreground md:text-7xl xl:text-[5.6rem]">
          تحكّم في عملك
          <br />
          كمدرب محترف
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-foreground/60 md:text-2xl md:leading-10">
          أدر عملاءك، برامجك، ومدفوعاتك في منصة واحدة مصممة لك بجودة تجربة تليق بعلامة fitness tech premium.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild className="h-14 rounded-full px-8 text-lg font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.3)]">
            <Link to="/register" className="inline-flex items-center gap-2">
              ابدأ مجاناً
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-14 rounded-full border-border bg-card/40 px-8 text-lg text-foreground hover:bg-card">
            <a href="#problem" className="inline-flex items-center gap-2">
              شاهد كيف تعمل
              <CirclePlay className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <DashboardMockup parallax={heroParallax} />
      </Reveal>
    </div>
  </section>
);

export default HeroSection;
