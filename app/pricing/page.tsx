"use client";

import Link from "next/link";
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { Check, X } from "lucide-react";

const features = [
  "Unlimited deliverability audits",
  "SPF / DKIM / DMARC analyzer",
  "Blacklist monitoring (24/7)",
  "Inbox placement tests",
  "DNS record generator",
  "Warm-up planner",
  "Email support",
];

export default function Page() {
  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-5xl mx-auto text-center">
        <PixelBadge tone="hazard" className="mb-4">★ NO CREDIT CARD ★</PixelBadge>
        <h1 className="font-pixel text-2xl md:text-4xl mb-4">PRICING</h1>
        <p className="font-mono-pixel text-xl text-muted-foreground mb-12">One plan. Free forever. Because spam shouldn't win.</p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Free Forever */}
          <PixelCard tone="gold" className="text-left">
            <PixelBadge tone="hazard" className="mb-4">★ RECOMMENDED ★</PixelBadge>
            <h2 className="font-pixel text-xl mb-2">LIFETIME FREE</h2>
            <div className="font-pixel text-5xl md:text-6xl my-6">$0</div>
            <p className="font-mono-pixel text-lg mb-6">Forever. No tiers. No trial.</p>
            <ul className="space-y-3 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 font-mono-pixel text-lg">
                  <span className="w-6 h-6 bg-crt-green border-2 border-ink flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/"><PixelButton variant="primary" size="lg" className="w-full">★ Claim Free Forever ★</PixelButton></Link>
          </PixelCard>

          {/* Comparison */}
          <PixelCard tone="paper" className="text-left">
            <h2 className="font-pixel text-base mb-4">VS. OTHER TOOLS</h2>
            <div className="space-y-4 font-mono-pixel text-lg">
              <Row name="GlockApps" price="$59/mo" bad />
              <Row name="MailGenius" price="$99/mo" bad />
              <Row name="Mailtrap" price="$15-$300/mo" bad />
              <Row name="Senders.com" price="$24/mo" bad />
              <div className="h-1 bg-ink my-2" />
              <Row name="SaveYourEmail" price="$0 forever" good />
            </div>
          </PixelCard>
        </div>
      </section>
    </PixelLayout>
  );
}

function Row({ name, price, good, bad }: { name: string; price: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`w-6 h-6 border-2 border-ink flex items-center justify-center shrink-0 ${good ? "bg-crt-green" : "bg-hazard"}`}>
          {good ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
        </span>
        <span className={good ? "font-pixel text-xs" : ""}>{name}</span>
      </div>
      <span className={bad ? "line-through opacity-60" : "font-pixel text-xs text-crt-green"}>{price}</span>
    </div>
  );
}
