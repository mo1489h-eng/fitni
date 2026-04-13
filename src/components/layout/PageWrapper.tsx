import { motion } from "framer-motion";
import type { ReactNode } from "react";

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2, ease: "easeOut" } as const,
};

export interface PageWrapperProps {
  children: ReactNode;
}

/**
 * Route content wrapper: subtle slide + fade for premium navigation feel.
 */
export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
      className="min-h-0"
    >
      {children}
    </motion.div>
  );
}
