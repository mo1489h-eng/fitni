import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Reveal, SectionHeading } from "./LandingUtils";

const testimonials = [
  { name: "أحمد المطيري", role: "مدرب تحول جسماني", quote: "fitni نقلني من إدارة مشتتة بين الرسائل والجداول إلى نظام واضح يجعل العميل يشعر أن لدي فريقاً كاملاً خلفه." },
  { name: "ريم الدوسري", role: "مدربة لياقة نسائية", quote: "أكثر شيء أحببته هو تجربة العميل نفسها. البورتال مرتب، والخطة الغذائية والبرنامج يظهران بشكل احترافي جداً." },
  { name: "خالد العتيبي", role: "مدرب أداء رياضي", quote: "المدفوعات والمتابعة الأسبوعية كانت تستهلك وقتي. الآن أعرف من دفع ومن تأخر ومن يحتاج تواصل خلال ثوانٍ." },
];

const TestimonialsSection = () => (
  <section className="border-t border-border px-4 py-24 md:px-6 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal>
        <SectionHeading eyebrow="آراء المدربين" title="قصص تبدو وكأنها حملة إعلانية… لأنها حقيقية" description="انطباع premium من أول نظرة وحتى آخر متابعة أسبوعية. هذا ما يشعر به المدرب والعميل معاً." centered />
      </Reveal>
      <Reveal delay={100} className="mt-14">
        <Carousel opts={{ align: "start", loop: true }} className="px-4 md:px-14">
          <CarouselContent>
            {testimonials.map((t) => (
              <CarouselItem key={t.name} className="md:basis-1/2 xl:basis-1/3">
                <Card className="h-full border-border bg-card/85">
                  <CardContent className="flex h-full flex-col p-8">
                    <div className="text-6xl font-black leading-none text-primary/18">"</div>
                    <p className="mt-4 flex-1 text-lg leading-8 text-foreground/72">{t.quote}</p>
                    <div className="mt-8 flex items-center gap-4">
                      <Avatar className="h-14 w-14 border border-border bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{t.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-foreground">{t.name}</div>
                        <div className="text-sm text-foreground/45">{t.role}</div>
                        <div className="mt-2 text-sm tracking-[0.4em] text-primary">★★★★★</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="border-border bg-card text-foreground hover:bg-card" />
          <CarouselNext className="border-border bg-card text-foreground hover:bg-card" />
        </Carousel>
      </Reveal>
    </div>
  </section>
);

export default TestimonialsSection;
