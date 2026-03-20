import { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureTooltipProps {
  id: string;
  targetSelector: string;
  message: string;
}

const FeatureTooltip = ({ id, targetSelector, message }: FeatureTooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const storageKey = `tooltip-seen-${id}`;

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "true") return;

    const timer = setTimeout(() => {
      const el = document.querySelector(targetSelector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.min(Math.max(16, rect.left), window.innerWidth - 280),
      });
      setVisible(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [targetSelector, storageKey]);

  useEffect(() => {
    if (!visible) return;
    const handle = () => dismiss();
    document.addEventListener("click", handle, { once: true });
    return () => document.removeEventListener("click", handle);
  }, [visible, dismiss]);

  if (!visible || !pos) return null;

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[300] w-64 rounded-lg border border-primary/30 bg-card p-3 shadow-xl",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300"
      )}
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-foreground leading-relaxed">{message}</p>
        <button
          onClick={dismiss}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default FeatureTooltip;
