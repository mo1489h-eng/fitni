import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Reveal, SectionHeading } from "./LandingUtils";

const facts = [
  {
    number: "3",
    unit: "ساعات",
    description: "يضيعها المدرب يومياً\nفي الإدارة بدل التدريب",
    accent: "CoachBase تردها لك",
    icon: Clock,
    iconColor: "text-primary",
  },
  {
    number: "80%",
    unit: "",
    description: "من المدربين يفقدون عملاء\nبسبب ضعف المتابعة والتنظيم",
    accent: "CoachBase تتابع بدلاً عنك",
    icon: TrendingDown,
    iconColor: "text-destructive",
  },
  {
    number: "40%",
    unit: "",
    description: "زيادة في الدخل للمدربين\nالذين ينظمون عملهم احترافياً",
    accent: "CoachBase تنظم كل شيء",
    icon: TrendingUp,
    iconColor: "text-primary",
  },
];

const TestimonialsSection = () => (
  <section className="border-t border-border px-4 py-24 md:px-6 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal>
        <SectionHeading
          eyebrow="أرقام حقيقية"
          title="لماذا يحتاج كل مدرب CoachBase؟"
          description="أرقام تتكلم عن نفسها"
          centered
        />
      </Reveal>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {facts.map((f, i) => (
          <Reveal key={f.number} delay={i * 120}>
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 transition-all duration-200 hover:border-primary/30"
              style={{ borderTop: "2px solid #4F6F52" }}>
              <div className="mb-6 flex items-center justify-between">
                <f.icon className={`h-6 w-6 ${f.iconColor}`} />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-[64px] font-extrabold leading-none text-primary">
                  {f.number}
                </span>
                {f.unit && (
                  <span className="text-2xl font-bold text-foreground">
                    {f.unit}
                  </span>
                )}
              </div>

              <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted-foreground">
                {f.description}
              </p>

              <div className="mt-6 border-t border-border pt-4">
                <span className="text-sm font-semibold text-foreground">
                  {f.accent}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
