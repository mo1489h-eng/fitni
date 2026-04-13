import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";

/**
 * Sun / moon control with Framer Motion cross-fade. Mount-guarded to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div
        className="h-11 w-11 shrink-0 rounded-full border border-border bg-card/80"
        aria-hidden
      />
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-border bg-card/80 transition-all duration-300 ease-in-out hover:border-primary/30 hover:shadow-md active:scale-95"
      onClick={toggle}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            role="img"
            aria-hidden
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center text-foreground"
          >
            <Moon className="h-5 w-5" strokeWidth={1.5} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            role="img"
            aria-hidden
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center text-amber-500"
          >
            <Sun className="h-5 w-5" strokeWidth={1.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
