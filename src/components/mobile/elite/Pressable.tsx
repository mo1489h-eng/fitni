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
  const motionProps = {
    type: "button" as const,
    whileTap: disabled ? undefined : { scale: 0.96 },
    transition: eliteSpring,
    disabled,
    className: cn(className),
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!disabled) void hapticImpact("light");
      onPointerDown?.(e);
    },
    ...rest,
  };
  return (
    <motion.button {...(motionProps as any)}>
      {children}
    </motion.button>
  );
}
