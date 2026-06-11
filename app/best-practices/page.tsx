import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";

const rules = [
  { t: "Authenticate (SPF + DKIM + DMARC)", d: "Without all three, Gmail and Outlook treat you like a stranger. Set DMARC to p=quarantine once SPF/DKIM align." },
  { t: "Warm up new domains", d: "Don't blast 10,000 emails on day one. Ramp up 50 → 100 → 250 → 500/day over 4 weeks." },
  { t: "Use a dedicated sending domain", d: "Send marketing from mail.yourdomain.com — protect your root domain's reputation." },
  { t: "Keep your list clean", d: "Remove hard bounces immediately. Suppress addresses that haven't opened in 90 days." },
  { t: "Write like a human", d: "Avoid ALL CAPS, $$$, excessive emojis, and 'FREE!!!' — classic spam triggers." },
  { t: "Maintain a plain-text version", d: "HTML-only emails look suspicious. Always include a multipart/alternative plain-text body." },
  { t: "One-click unsubscribe (RFC 8058)", d: "Required by Gmail/Yahoo for bulk senders. Add the List-Unsubscribe-Post header." },
  { t: "Watch your complaint rate", d: "Keep spam complaints under 0.1%. Above 0.3% and you're blacklisted." },
  { t: "Send at consistent volume", d: "Spiky volume looks like a hacked account. Spread sends across days, not minutes." },
  { t: "Monitor blacklists weekly", d: "Spamhaus, SORBS, Barracuda. One listing can tank your inbox rate by 40%." },
];

export default function Page() {
  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <PixelBadge tone="green" className="mb-4">★ STRATEGY GUIDE ★</PixelBadge>
        <h1 className="font-pixel text-2xl md:text-4xl mb-4">EMAIL BEST PRACTICES</h1>
        <p className="font-mono-pixel text-xl text-muted-foreground mb-12">
          The 10 rules that decide whether your email lands in the inbox or the spam folder. Memorize them.
        </p>
        <div className="space-y-6">
          {rules.map((r, i) => (
            <PixelCard key={r.t} tone="paper">
              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-12 h-12 bg-hazard text-paper border-4 border-ink font-pixel text-sm flex items-center justify-center">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-pixel text-sm mb-2">{r.t}</h3>
                  <p className="font-mono-pixel text-lg">{r.d}</p>
                </div>
              </div>
            </PixelCard>
          ))}
        </div>
      </section>
    </PixelLayout>
  );
}
