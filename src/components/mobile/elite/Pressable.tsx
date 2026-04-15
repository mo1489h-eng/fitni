import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticImpact } from "../workout/haptics";
import { eliteSpring } from "./spring";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
};

/** Primary tap target: light haptic + spring scale */
export function Pressable({ children, className, disabled, onPointerDown, ...rest }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={eliteSpring}
      disabled={disabled}
      className={cn(className)}
      onPointerDown={(e) => {
        if (!disabled) void hapticImpact("light");
        onPointerDown?.(e);
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
