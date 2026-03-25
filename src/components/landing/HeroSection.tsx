import { Link } from "react-router-dom";
import { ArrowLeft, CirclePlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "./LandingUtils";
import heroTrainer from "@/assets/landing-hero-trainer.jpeg";
import gymBg from "@/assets/landing-gym-bg.jpeg";

const HeroSection = ({ heroParallax }: { heroParallax: number }) => (
  <section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-28 md:px-6">
    {/* Full background gym image with 70% dark overlay + parallax */}
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${gymBg})`,
        transform: `translate3d(0, ${heroParallax * 0.5}px, 0)`,
        willChange: "transform",
      }}
    >
      <div className="absolute inset-0 bg-background/[0.70]" />
    </div>

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_88%,hsl(var(--primary)/0.2),transparent_28%)]" />
    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:96px_96px]" />

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

      {/* Hero trainer image */}
      <Reveal delay={120}>
        <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1rem]">
          <div className="absolute inset-x-10 bottom-0 h-28 rounded-full bg-primary/20 blur-3xl" />
          <img
            src={heroTrainer}
            alt="مدرب شخصي يستخدم منصة CoachBase"
            loading="lazy"
            className="relative w-full rounded-[1rem] object-cover shadow-[0_30px_90px_hsl(var(--primary)/0.15)]"
            style={{ aspectRatio: "4/3" }}
          />
          <div className="absolute inset-0 rounded-[1rem] bg-background/[0.40]" />
          {/* Green glow border */}
          <div className="absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-primary/20" />
        </div>
      </Reveal>
    </div>
  </section>
);

export default HeroSection;
