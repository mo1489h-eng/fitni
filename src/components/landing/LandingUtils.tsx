import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
};

export const useInView = <T extends HTMLElement>(threshold = 0.2) => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
};

export const Reveal = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : "translate3d(0,24px,0)",
        transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

export const SectionHeading = ({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description?: string; centered?: boolean }) => (
  <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-xl"}>
    <Badge className="mb-5 rounded-full border border-primary/25 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
      {eyebrow}
    </Badge>
    <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-foreground md:text-6xl">{title}</h2>
    {description ? <p className="mt-5 text-lg leading-8 text-foreground/65">{description}</p> : null}
  </div>
);

export const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card/70 px-4 py-3">
    <div className="text-xl font-black text-foreground">{value}</div>
    <div className="mt-1 text-xs text-foreground/50">{label}</div>
  </div>
);

export const DeviceShell = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-[2rem] border border-border bg-card/90 p-3 shadow-sm backdrop-blur ${className}`}>
    <div className="overflow-hidden rounded-[1.55rem] border border-border bg-background">{children}</div>
  </div>
);
