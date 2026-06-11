import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";

const changelog = [
  { date: "Jun 2026", title: "v2.0 — 8-bit Era", desc: "Full rebrand. Free forever, pixel forever.", badge: "LATEST" },
  { date: "Mar 2026", title: "v1.5 — Blacklist Monitor", desc: "24/7 monitoring across 30+ DNSBLs with pixel-pager alerts." },
  { date: "Jan 2026", title: "v1.0 — Public Launch", desc: "SPF/DKIM/DMARC audits, warm-up planner, inbox placement tests." },
  { date: "Nov 2025", title: "v0.1 — Day Zero", desc: "Built in a weekend out of pure spite for $300/mo deliverability tools." },
];

export default function Page() {
  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <PixelBadge tone="grape" className="mb-4">★ LORE ★</PixelBadge>
        <h1 className="font-pixel text-2xl md:text-4xl mb-6">OUR MISSION</h1>
        <div className="font-mono-pixel text-xl space-y-6 mb-16">
          <p>
            Email is the last open protocol on the internet. It belongs to everyone. But deliverability
            tooling — the thing that decides whether your email arrives — costs $300/month minimum.
          </p>
          <p>
            That's a tax on small senders. On indie founders. On non-profits. On newsletters that
            haven't found product-market fit yet.
          </p>
          <p className="text-hazard font-pixel text-base">
            We don't think that's fair.
          </p>
          <p>
            So we built SaveYourEmail. Lifetime free. No tiers. No "starting at". The founder pays the
            server bill. You get the inbox. Spam loses.
          </p>
          <p>
            That's the whole game.
          </p>
        </div>

        <h2 className="font-pixel text-xl mb-2">★ CHANGELOG ★</h2>
        <p className="font-mono-pixel text-lg text-muted-foreground mb-8">What we shipped and when.</p>
        <div className="space-y-6">
          {changelog.map((c) => (
            <PixelCard key={c.title} tone="paper">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="font-pixel text-[10px] uppercase bg-ink text-paper px-3 py-2">{c.date}</div>
                {c.badge && <PixelBadge tone="hazard">{c.badge}</PixelBadge>}
              </div>
              <h3 className="font-pixel text-sm mt-4 mb-2">{c.title}</h3>
              <p className="font-mono-pixel text-lg">{c.desc}</p>
            </PixelCard>
          ))}
        </div>
      </section>
    </PixelLayout>
  );
}
