import { Check, CreditCard, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal, DeviceShell, MiniStat } from "./LandingUtils";

type Feature = { number: string; title: string; description: string; id: string };

const features: Feature[] = [
  { number: "01", title: "إدارة العملاء", description: "كل عملاءك في مكان واحد، بروفايل كامل، تقدم حقيقي، ومتابعة دقيقة بدون تشتيت.", id: "clients" },
  { number: "02", title: "برامج تدريب ذكية", description: "ابنِ برامج احترافية بسرعة، أو دع الذكاء الاصطناعي يقترح الهيكل الأمثل لكل عميل.", id: "programs" },
  { number: "03", title: "مدفوعات أونلاين", description: "استقبل المدفوعات بسهولة عبر مدى، فيزا، وApple Pay مع وضوح كامل لحالة كل اشتراك.", id: "payments" },
  { number: "04", title: "بورتال المتدرب", description: "كل عميل لديه بورتال خاص يشاهد منه برنامجه، يسجل تمارينه، ويتابع تقدمه أسبوعياً.", id: "portal" },
];

const ClientsVisual = () => (
  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
    <Card className="border-border bg-card/80">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div><div className="font-bold text-foreground">قائمة العملاء</div><div className="text-sm text-foreground/45">نشاط مباشر</div></div>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-3">
          {[{ name: "سارة", tag: "أسبوع 6" }, { name: "عبدالله", tag: "خطة جديدة" }, { name: "دانة", tag: "دفعة مكتملة" }].map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-2xl border border-border bg-background/80 px-4 py-3">
              <div><div className="font-semibold text-foreground">{item.name}</div><div className="text-sm text-foreground/45">{item.tag}</div></div>
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    <Card className="border-border bg-card/80">
      <CardContent className="p-5">
        <div className="mb-6 flex items-center justify-between">
          <div><div className="font-bold text-foreground">ملف العميل</div><div className="text-sm text-foreground/45">تقدم، قياسات، التزام</div></div>
          <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">نشط</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniStat label="الالتزام" value="94%" />
          <MiniStat label="الوزن" value="-5.2 كجم" />
          <MiniStat label="الجلسات" value="18" />
          <MiniStat label="آخر تحديث" value="اليوم" />
        </div>
      </CardContent>
    </Card>
  </div>
);

const ProgramsVisual = () => (
  <Card className="overflow-hidden border-border bg-card/80">
    <CardContent className="p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div><div className="font-bold text-foreground">Program Builder</div><div className="text-sm text-foreground/45">Week 1 · Upper / Lower Split</div></div>
        <Zap className="h-5 w-5 text-primary" />
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          {["اليوم 1 · دفع علوي", "اليوم 2 · سحب علوي", "اليوم 3 · رجلين"].map((day, index) => (
            <div key={day} className={`rounded-2xl border px-4 py-3 ${index === 0 ? "border-primary/30 bg-primary/10" : "border-border bg-background/70"}`}>
              <div className="font-semibold text-foreground">{day}</div><div className="text-sm text-foreground/45">6 تمارين</div>
            </div>
          ))}
        </div>
        <div className="rounded-[1.5rem] border border-border bg-background/75 p-4">
          <div className="space-y-3">
            {["Bench Press · 4 × 8", "Incline Dumbbell Press · 3 × 10", "Cable Fly · 3 × 12", "Shoulder Press · 4 × 8"].map((exercise, index) => (
              <div key={exercise} className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-4 py-3">
                <span className="font-medium text-foreground">{exercise}</span>
                <span className="text-sm text-foreground/45">#{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PaymentsVisual = () => (
  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div><div className="font-bold text-foreground">الحركة المالية</div><div className="text-sm text-foreground/45">مدفوعات، تجديدات، تنبيهات</div></div>
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div className="rounded-[1.75rem] border border-primary/20 bg-primary/10 p-5">
          <div className="text-sm text-foreground/55">هذا الشهر</div>
          <div className="mt-2 text-4xl font-black text-foreground">24,960 ر.س</div>
        </div>
        <div className="space-y-3">
          {["اشتراك سارة · مكتمل", "اشتراك خالد · بانتظار", "جلسة ريم · Apple Pay"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl border border-border bg-background/75 px-4 py-3">
              <span className="text-foreground/78">{item}</span><Check className="h-4 w-4 text-primary" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    <DeviceShell className="max-w-sm">
      <div className="space-y-4 bg-card/80 p-5">
        <div className="text-center">
          <div className="text-sm text-foreground/45">Payment Options</div>
          <div className="mt-2 text-2xl font-black text-foreground">مدى · Visa · Apple Pay</div>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-background p-4">
          <div className="mb-4 text-sm text-foreground/50">Apple Pay</div>
          <div className="mb-5 h-24 rounded-[1.25rem] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.14),hsl(var(--background)))]" />
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-foreground">69 ر.س</div>
            <div className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Instant</div>
          </div>
        </div>
      </div>
    </DeviceShell>
  </div>
);

const PortalVisual = () => (
  <div className="mx-auto max-w-sm">
    <DeviceShell>
      <div className="bg-card/80 p-4">
        <div className="mb-4 rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4">
          <div className="text-sm text-foreground/50">Portal Home</div>
          <div className="mt-1 text-2xl font-black text-foreground">أهلاً سارة</div>
        </div>
        <div className="space-y-3">
          {["برنامج اليوم · Push Day", "الخطة الغذائية · 2,100 kcal", "التقرير الأسبوعي · جاهز"].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-background/75 px-4 py-3"><div className="font-medium text-foreground">{item}</div></div>
          ))}
        </div>
      </div>
    </DeviceShell>
  </div>
);

const FeatureVisual = ({ id }: { id: string }) => {
  if (id === "clients") return <ClientsVisual />;
  if (id === "programs") return <ProgramsVisual />;
  if (id === "payments") return <PaymentsVisual />;
  return <PortalVisual />;
};

const FeaturesSection = () => (
  <section id="features">
    {features.map((feature, index) => {
      const reverse = index % 2 === 1;
      return (
        <section key={feature.number} className="relative flex min-h-screen items-center border-t border-border px-4 py-24 md:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_30%)]" />
          <div className={`relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-2 lg:items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <Reveal>
              <div className="max-w-xl">
                <div className="text-7xl font-black leading-none text-primary/18 md:text-8xl">{feature.number}</div>
                <h2 className="mt-6 text-4xl font-black leading-tight text-foreground md:text-6xl">{feature.title}</h2>
                <p className="mt-6 text-xl leading-9 text-foreground/60">{feature.description}</p>
              </div>
            </Reveal>
            <Reveal delay={120}><FeatureVisual id={feature.id} /></Reveal>
          </div>
        </section>
      );
    })}
  </section>
);

export default FeaturesSection;
