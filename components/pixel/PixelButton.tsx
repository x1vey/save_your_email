"use client";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-paper",
  secondary: "bg-gold text-ink",
  danger: "bg-hazard text-paper",
  accent: "bg-crt-green text-ink",
  ghost: "bg-paper text-ink",
};

const sizeClasses = {
  sm: "px-3 py-2 text-[10px]",
  md: "px-5 py-3 text-xs",
  lg: "px-7 py-4 text-sm",
};

export const PixelButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "pixel-border pixel-press font-pixel uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer select-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
PixelButton.displayName = "PixelButton";
