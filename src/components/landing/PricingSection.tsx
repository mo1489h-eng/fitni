import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal, SectionHeading } from "./LandingUtils";

const planFeatures = {
  basic: ["حتى 10 عملاء", "برامج تدريب كاملة", "خطة غذائية لكل عميل", "جلسات وتقويم"],
  pro: ["عملاء غير محدودين", "AI Copilot", "بوابة متدرب كاملة", "مدفوعات ومتابعة متقدمة"],
};

const PricingSection = () => (
  <section id="pricing" className="border-t border-border px-4 py-24 md:px-6 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal>
        <SectionHeading eyebrow="التسعير" title="سعر واحد. كل شيء مشمول" description="ابدأ مجاناً لفترة الإطلاق، ثم اختر الباقة المناسبة لنموك بدون تعقيد أو رسوم خفية." centered />
      </Reveal>
      <Reveal delay={100} className="mx-auto mt-8 max-w-3xl">
        <div className="rounded-[2rem] border border-primary/20 bg-primary/10 px-6 py-5 text-center space-y-1">
          <div className="text-lg font-bold text-primary">كل المدربين: مجاناً 3 شهور كاملة</div>
          <div className="text-sm text-foreground/60">أول 100 مدرب يحصلون على 3 شهور مجاناً + الشهر الأول بالباقة الاحترافية بسعر الأساسية</div>
        </div>
      </Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full border-border bg-card/85">
            <CardContent className="p-8">
              <div className="text-sm text-foreground/45">أساسي</div>
              <div className="mt-2 text-5xl font-black text-foreground">99 <span className="text-xl text-foreground/45">ريال/شهر</span></div>
              <p className="mt-4 text-lg text-foreground/60">حتى 10 عملاء</p>
              <div className="mt-8 space-y-4">
                {planFeatures.basic.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-foreground/78">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"><Check className="h-4 w-4" /></div>
                    {item}
                  </div>
                ))}
              </div>
              <Button asChild className="mt-10 h-14 w-full rounded-full text-base font-bold"><Link to="/register">ابدأ مجاناً</Link></Button>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={120}>
          <Card className="relative h-full overflow-hidden border-primary/30 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.15),transparent_45%),hsl(var(--card))] shadow-[0_24px_90px_hsl(var(--primary)/0.18)]">
            <div className="absolute right-6 top-6 flex flex-col items-end gap-2">
              <Badge className="rounded-full border border-primary/20 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">الأكثر شعبية</Badge>
              <Badge className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">لأول 100 مدرب</Badge>
            </div>
            <CardContent className="p-8 pt-20">
              <div className="text-sm text-foreground/55">احترافي</div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-5xl font-black text-primary">99</span>
                <span className="text-2xl font-bold text-foreground/30 line-through">179</span>
                <span className="text-xl text-foreground/45">ريال/شهر</span>
              </div>
              <div className="mt-2 space-y-0.5">
                <p className="text-sm font-semibold text-primary">الشهر الأول فقط للمؤسسين</p>
                <p className="text-xs text-foreground/50">ثم 179 ريال/شهر</p>
              </div>
              <p className="mt-4 text-lg text-foreground/70">عملاء غير محدودين</p>
              <div className="mt-8 space-y-4">
                {planFeatures.pro.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-foreground/82">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"><Check className="h-4 w-4" /></div>
                    {item}
                  </div>
                ))}
              </div>
              <Button asChild className="mt-10 h-14 w-full rounded-full text-base font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.28)]"><Link to="/register">ابدأ مجاناً</Link></Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  </section>
);

export default PricingSection;
