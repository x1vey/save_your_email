"use client";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: "paper" | "gold" | "green" | "sky" | "grape" | "hazard";
  children: ReactNode;
}

const toneClasses = {
  paper: "bg-card text-card-foreground",
  gold: "bg-gold text-ink",
  green: "bg-crt-green text-ink",
  sky: "bg-sky text-paper",
  grape: "bg-grape text-paper",
  hazard: "bg-hazard text-paper",
};

export function PixelCard({ tone = "paper", className, children, ...props }: Props) {
  return (
    <div
      className={cn("pixel-border p-6", toneClasses[tone], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PixelBadge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-1 font-pixel text-[10px] uppercase border-2 border-ink",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
