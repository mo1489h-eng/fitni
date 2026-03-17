import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const AnimatedCounter = ({ end, duration = 1200, prefix = "", suffix = "", className = "" }: AnimatedCounterProps) => {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current && current === end) return;
    started.current = true;
    
    if (end === 0) { setCurrent(0); return; }

    const startTime = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(startVal + (end - startVal) * eased);
      setCurrent(val);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [end, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
};

export default AnimatedCounter;
