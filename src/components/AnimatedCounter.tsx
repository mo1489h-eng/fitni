import { forwardRef, useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const AnimatedCounter = forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  ({ end, duration = 1200, prefix = "", suffix = "", className = "" }, forwardedRef) => {
    const [current, setCurrent] = useState(0);
    const internalRef = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
      if (started.current && current === end) return;
      started.current = true;
      if (end === 0) { setCurrent(0); return; }
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCurrent(Math.round(end * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, [end, duration]);

    return (
      <span ref={forwardedRef || internalRef} className={`tabular-nums ${className}`}>
        {prefix}{current.toLocaleString()}{suffix}
      </span>
    );
  }
);

AnimatedCounter.displayName = "AnimatedCounter";

export default AnimatedCounter;
