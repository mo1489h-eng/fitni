import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./LandingUtils";

const FinalCTA = () => (
  <section className="relative flex min-h-screen items-center overflow-hidden border-t border-border px-4 py-24 md:px-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_28%)]" />
    <div className="relative mx-auto max-w-4xl text-center">
      <Reveal>
        <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-foreground md:text-7xl xl:text-[5.4rem]">
          ابدأ رحلتك
          <br />
          كمدرب محترف
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-xl leading-9 text-foreground/60">
          مجاني 3 شهور. بدون بطاقة ائتمان. ومن أول يوم ستشعر أن التشغيل أصبح جزءاً من علامتك لا عبئاً عليها.
        </p>
        <Button asChild className="mt-10 h-16 rounded-full px-10 text-xl font-black shadow-none">
          <Link to="/register" className="inline-flex items-center gap-2">
            سجّل الآن مجاناً
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </Reveal>
    </div>
  </section>
);

export default FinalCTA;
