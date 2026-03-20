import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "./LandingUtils";

const AICopilotSection = ({ copilotStep }: { copilotStep: number }) => (
  <section
    className="relative overflow-hidden border-t border-border px-4 py-24 md:px-6 md:py-32"
    style={{ ["--copilot-glow" as string]: "276 62% 46%" } as React.CSSProperties}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--copilot-glow)/0.16),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.18),transparent_34%)]" />
    <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <Reveal>
        <Badge className="mb-6 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
          <Sparkles className="ml-2 h-4 w-4" />
          جديد · الذكاء الاصطناعي
        </Badge>
        <h2 className="text-4xl font-black leading-tight text-foreground md:text-6xl">كوبايلت الذكاء الاصطناعي</h2>
        <p className="mt-6 max-w-xl text-xl leading-9 text-foreground/60">
          أدخل بيانات عميلك واحصل على برنامج تدريب كامل في 8 ثوانٍ، بصياغة واضحة وقابلة للتخصيص فوراً.
        </p>
        <Button asChild className="mt-10 h-14 rounded-full px-8 text-lg font-bold shadow-[0_20px_60px_hsl(var(--primary)/0.28)]">
          <Link to="/register" className="inline-flex items-center gap-2">جرّب الكوبايلت<ArrowLeft className="h-5 w-5" /></Link>
        </Button>
      </Reveal>

      <Reveal delay={140}>
        <Card className="overflow-hidden border-border bg-card/85 backdrop-blur">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[0.85fr_1.15fr]">
            <div className="border-b border-border p-6 md:border-b-0 md:border-l">
              <div className="mb-5 flex items-center justify-between">
                <div><div className="font-bold text-foreground">Client Input</div><div className="text-sm text-foreground/45">Live AI generation</div></div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-4">
                {[
                  { label: "الهدف", active: copilotStep >= 0, value: "زيادة كتلة عضلية" },
                  { label: "الأيام", active: copilotStep >= 1, value: "4 أيام بالأسبوع" },
                  { label: "الخبرة", active: copilotStep >= 2, value: "متوسط" },
                ].map((field) => (
                  <div key={field.label} className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="mb-3 text-sm text-foreground/45">{field.label}</div>
                    <div className={`h-11 rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${field.active ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-card text-transparent"}`}>
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div><div className="font-bold text-foreground">Generated Program</div><div className="text-sm text-foreground/45">Week 1 structure</div></div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">جاهز</div>
              </div>
              <div className={`rounded-[1.75rem] border border-primary/20 bg-background/80 p-4 transition-all duration-500 ${copilotStep === 3 ? "shadow-[0_0_60px_hsl(var(--primary)/0.18)]" : ""}`}>
                <div className="space-y-3">
                  {["Push · 6 تمارين", "Pull · 6 تمارين", "Legs · 7 تمارين", "Upper · 5 تمارين"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl border border-border bg-card/75 px-4 py-3">
                      <span className="font-medium text-foreground">{item}</span>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  </section>
);

export default AICopilotSection;
