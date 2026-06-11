"use client";
import type { ReactNode } from "react";
import { PixelHeader } from "./PixelHeader";
import { PixelFooter } from "./PixelFooter";

export function PixelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <PixelHeader />
      <main className="flex-1">{children}</main>
      <PixelFooter />
    </div>
  );
}
