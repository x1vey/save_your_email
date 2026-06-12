"use client";

import { useState } from "react";
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { toast } from "sonner";

const inputClass = "w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg focus:outline-none focus:bg-paper";

export default function Page() {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    toast.success("AUDIT BOOKED ✓ We'll email you within 24h");
  }

  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <PixelBadge tone="hazard" className="mb-4">★ PREMIUM LEVEL ★</PixelBadge>
        <h1 className="font-pixel text-2xl md:text-4xl mb-4">BOOK AN EXPERT AUDIT</h1>
        <p className="font-mono-pixel text-xl text-muted-foreground mb-10">
          30 minutes. One pixel-clear report. We'll teach you exactly what's breaking your deliverability. (Note: This is a paid, premium service.)
        </p>

        {submitted ? (
          <PixelCard tone="green" className="text-center">
            <h2 className="font-pixel text-xl mb-4">★ LEVEL COMPLETE ★</h2>
            <p className="font-mono-pixel text-xl">Check your inbox in the next 24 hours. We'll send a calendar link.</p>
          </PixelCard>
        ) : (
          <PixelCard tone="paper">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="font-pixel text-[10px] uppercase mb-2 block">Your Name</label>
                <input required name="name" className={inputClass} placeholder="Player One" />
              </div>
              <div>
                <label className="font-pixel text-[10px] uppercase mb-2 block">Email</label>
                <input required type="email" name="email" className={inputClass} placeholder="you@domain.com" />
              </div>
              <div>
                <label className="font-pixel text-[10px] uppercase mb-2 block">Sending Domain</label>
                <input required name="domain" className={inputClass} placeholder="mail.yourdomain.com" />
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="font-pixel text-[10px] uppercase mb-2 block">Monthly Volume</label>
                  <select required name="volume" className={inputClass}>
                    <option value="">Pick one</option>
                    <option>0 – 5k</option>
                    <option>5k – 50k</option>
                    <option>50k – 500k</option>
                    <option>500k+</option>
                  </select>
                </div>
                <div>
                  <label className="font-pixel text-[10px] uppercase mb-2 block">Current ESP</label>
                  <input required name="esp" className={inputClass} placeholder="Resend, Mailchimp..." />
                </div>
              </div>
              <div>
                <label className="font-pixel text-[10px] uppercase mb-2 block">Tell us what's broken</label>
                <textarea name="notes" rows={4} className={inputClass} placeholder="Emails landing in spam, low open rates, etc." />
              </div>
              <PixelButton type="submit" variant="primary" size="lg" className="w-full">★ Start Audit ★</PixelButton>
            </form>
          </PixelCard>
        )}
      </section>
    </PixelLayout>
  );
}
