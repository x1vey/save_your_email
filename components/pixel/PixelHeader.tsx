"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { PixelButton } from "./PixelButton";
import { usePathname } from "next/navigation";

const links = [
  { to: "/", label: "Home" },
  { to: "/best-practices", label: "Best Practices" },
  { to: "/pricing", label: "Pricing" },
  { to: "/mission", label: "Mission" },
  { to: "/audit", label: "Book Audit" },
] as const;

export function PixelHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-paper border-b-4 border-ink">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-pixel text-xs uppercase">
          <span className="inline-block w-8 h-8 bg-gold border-2 border-ink relative">
            <span className="absolute inset-1 bg-hazard" />
            <span className="absolute inset-2 bg-paper" />
          </span>
          <span>SaveYourEmail</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 font-pixel text-[11px] uppercase">
          {links.map((l) => {
            const isActive = l.to === "/" ? pathname === "/" : pathname === l.to;
            return (
              <Link
                key={l.to}
                href={l.to}
                className={`transition-colors ${isActive ? "text-hazard underline decoration-4 underline-offset-4" : "hover:text-hazard"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link href="/login">
            <PixelButton variant="secondary" size="sm">Log In</PixelButton>
          </Link>
        </div>

        <button
          className="md:hidden pixel-border-sm bg-paper p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t-4 border-ink bg-paper">
          <div className="px-4 py-4 flex flex-col gap-3 font-pixel text-xs uppercase">
            {links.map((l) => (
              <Link key={l.to} href={l.to} onClick={() => setOpen(false)} className="py-1">
                {l.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              <PixelButton variant="secondary" size="sm" className="w-full">Log In</PixelButton>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
