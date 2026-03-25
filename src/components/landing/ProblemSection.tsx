import { BarChart3, Check, FileText, MessageSquareText, Receipt, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal, SectionHeading } from "./LandingUtils";
import trainerConfident from "@/assets/landing-trainer-confident.jpeg";

const ProblemPanel = ({ variant, title, items }: { variant: "before" | "after"; title: string; items: string[] }) => {
  const before = variant === "before";
  return (
    <Card className={`relative overflow-hidden border-border/80 ${before ? "bg-card" : "bg-card/80"}`}>
      <div className={`absolute inset-0 opacity-100 ${before ? "bg-[radial-gradient(circle_at_top_left,hsl(var(--destructive)/0.16),transparent_45%)]" : "bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_45%)]"}`} />
      <CardContent className="relative p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className={`rounded-2xl border p-3 ${before ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/10 text-primary"}`}>
            {before ? <MessageSquareText className="h-6 w-6" /> : <BarChart3 className="h-6 w-6" />}
          </div>
          <div>
            <div className="text-sm text-foreground/45">{before ? "قبل CoachBase" : "مع CoachBase"}</div>
            <h3 className="text-3xl font-black text-foreground">{title}</h3>
          </div>
        </div>

        {/* Visual area */}
        <div className="mb-8">
          {before ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                <MessageSquareText className="mb-8 h-8 w-8 text-destructive" />
                <div className="h-2 w-14 rounded-full bg-destructive/40" />
              </div>
              <div className="rounded-2xl border border-destructive/20 bg-background/70 p-4">
                <FileText className="mb-8 h-8 w-8 text-foreground/40" />
                <div className="h-2 w-full rounded-full bg-foreground/10" />
              </div>
              <div className="rounded-2xl border border-destructive/20 bg-background/70 p-4">
                <Receipt className="mb-8 h-8 w-8 text-foreground/40" />
                <div className="h-2 w-10 rounded-full bg-foreground/10" />
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[12px]">
              <img
                src={trainerConfident}
                alt="مدرب يستخدم CoachBase باحترافية"
                loading="lazy"
                className="w-full object-cover"
                style={{ aspectRatio: "16/9" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
              <div className="absolute inset-0 rounded-[12px] ring-1 ring-inset ring-primary/20" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 text-lg text-foreground/78">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${before ? "border-destructive/25 bg-destructive/10 text-destructive" : "border-primary/25 bg-primary/10 text-primary"}`}>
                {before ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ProblemSection = () => (
  <section id="problem" className="relative px-4 py-24 md:px-6 md:py-32">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--foreground)/0.03),transparent_35%)]" />
    <div className="relative mx-auto max-w-7xl">
      <Reveal>
        <SectionHeading eyebrow="من الفوضى إلى النظام" title="نفس الخدمة. تجربة تشغيل مختلفة بالكامل" description="كل ما كان يتطلب رسائل، ملفات، وتذكير يدوي، أصبح اليوم منظومة واحدة بوضوح بصري وعملي." centered />
      </Reveal>
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <ProblemPanel variant="before" title="الطريقة القديمة" items={["فوضى في واتساب", "Excel معقد ومرهق", "مدفوعات منسية", "وقت ضايع في الإدارة"]} />
        </Reveal>
        <Reveal delay={100}>
          <ProblemPanel variant="after" title="تشغيل احترافي" items={["كل شيء في مكان واحد", "برامج احترافية في دقائق", "مدفوعات تلقائية", "ركّز على التدريب فقط"]} />
        </Reveal>
      </div>
    </div>
  </section>
);

export default ProblemSection;
