import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, CalendarDays, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "./LandingUtils";

const agentExamples = [
  {
    icon: MessageSquare,
    trainer: "عدّل برنامج أحمد وخلي الراحة 90 ثانية",
    ai: "تم تعديل 6 تمارين",
  },
  {
    icon: CalendarDays,
    trainer: "أضف جلسة لمحمد الأحد 6 مساء",
    ai: "تمت إضافة الجلسة للتقويم",
  },
  {
    icon: Bell,
    trainer: "أرسل تذكير لكل العملاء الغايبين",
    ai: "تم إرسال 4 تذكيرات",
  },
];

const AIAgentSection = () => (
  <section className="relative overflow-hidden border-t border-border px-4 py-24 md:px-6 md:py-32">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_50%)]" />
    <div className="relative mx-auto max-w-5xl text-center">
      <Reveal>
        <h2 className="text-4xl font-black leading-tight text-foreground md:text-5xl">
          مساعد ذكي يتصرف بدلا عنك
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg leading-9 text-foreground/55">
          لا تحتاج تنقر وتبحث — فقط قل للكوبايلت إيش تبغى وهو يسوّيه فورا
        </p>
      </Reveal>

      <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-3">
        {agentExamples.map((ex, i) => {
          const Icon = ex.icon;
          return (
            <Reveal key={i} delay={i * 120}>
              <Card className="h-full border-primary/15 bg-card/80 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:bg-card-hover">
                <CardContent className="flex flex-col gap-4 p-5 text-right">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-xs text-muted-foreground">المدرب:</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{ex.trainer}</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-primary/70">الكوبايلت:</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
                      {ex.ai}
                      <span className="text-primary">&#10003;</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={400}>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" strokeWidth={1.5} />
          <span>الكوبايلت يصل فقط لبيانات عملاءك — بأمان تام</span>
        </div>
        <Button
          asChild
          className="mt-8 h-14 rounded-full px-8 text-lg font-bold shadow-none"
        >
          <Link to="/register" className="inline-flex items-center gap-2">
            جرّب الكوبايلت مجانا
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </Reveal>
    </div>
  </section>
);

export default AIAgentSection;
