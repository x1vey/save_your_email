"use client";
import Link from "next/link";

export function PixelFooter() {
  return (
    <footer className="border-t-4 border-ink bg-ink text-paper mt-20">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 md:grid-cols-4 font-mono-pixel text-base">
        <div>
          <div className="font-pixel text-xs mb-3 text-gold">SAVEYOUREMAIL</div>
          <p className="text-paper/80">Stop letting your emails die in spam. Free, forever.</p>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase mb-3 text-gold">Product</div>
          <ul className="space-y-2">
            <li><Link href="/pricing" className="hover:text-gold">Pricing</Link></li>
            <li><Link href="https://calendly.com/hi-hisubhadeep/30min" target="_blank" className="hover:text-gold">Book Audit</Link></li>
            <li><Link href="/best-practices" className="hover:text-gold">Best Practices</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase mb-3 text-gold">Company</div>
          <ul className="space-y-2">
            <li><Link href="/mission" className="hover:text-gold">Our Mission</Link></li>
            <li><Link href="/login" className="hover:text-gold">Log In</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase mb-3 text-gold">Insert Coin</div>
          <p className="text-paper/60">© {new Date().getFullYear()} — Press START</p>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="w-3 h-3" style={{ background: ["#ef4444","#facc15","#22c55e","#3b82f6","#a855f7","#ef4444","#facc15","#22c55e"][i] }} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
