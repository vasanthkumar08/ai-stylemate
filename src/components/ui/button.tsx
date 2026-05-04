"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#363b6c] text-white hover:bg-[#a8a3e3] hover:text-[#111827] hover:shadow-[0_14px_34px_rgba(54,59,108,0.22)]",
  secondary:
    "border border-[#c6c9e7]/70 bg-white/70 text-[var(--foreground)] hover:bg-white",
  ghost: "text-[var(--foreground)] hover:bg-white/70"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export function Button({
  asChild = false,
  children,
  className,
  size = "md",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const classNames = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm",
    sizes[size],
    variants[variant],
    className
  );

  if (asChild) {
    return (
      <Slot className={classNames} {...props}>
        {children}
      </Slot>
    );
  }

  const motionButtonProps = props as unknown as ComponentProps<typeof motion.button>;

  return (
    <motion.button
      className={classNames}
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...motionButtonProps}
    >
      {children}
    </motion.button>
  );
}
