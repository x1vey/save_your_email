"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { PixelButton } from "./PixelButton";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { to: "/", label: "Home" },
  { to: "/best-practices", label: "Best Practices" },
  { to: "/pricing", label: "Pricing" },
  { to: "/mission", label: "Mission" },
  { to: "https://calendly.com/psycicx1ve/30min", label: "Book Audit", external: true },
] as const;

export function PixelHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Player";

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
                target={(l as any).external ? "_blank" : undefined}
                className={`transition-colors ${isActive ? "text-hazard underline decoration-4 underline-offset-4" : "hover:text-hazard"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="font-pixel text-[11px] text-muted-foreground uppercase">Hey {name}</span>
              <button onClick={handleLogout} className="font-pixel text-[11px] uppercase hover:text-hazard">Logout</button>
            </>
          ) : (
            <Link href="/login">
              <PixelButton variant="secondary" size="sm">Log In</PixelButton>
            </Link>
          )}
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
              <Link key={l.to} href={l.to} target={(l as any).external ? "_blank" : undefined} onClick={() => setOpen(false)} className="py-1">
                {l.label}
              </Link>
            ))}
            
            {user ? (
              <div className="flex justify-between items-center py-2 border-t-2 border-ink border-dashed mt-2 pt-4">
                <span className="font-pixel text-[11px] text-muted-foreground">HEY {name.toUpperCase()}</span>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="font-pixel text-[11px] text-hazard hover:underline">LOGOUT</button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <PixelButton variant="secondary" size="sm" className="w-full">Log In</PixelButton>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
