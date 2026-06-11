"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";

export default function Page() {
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "code") setTimeout(() => refs.current[0]?.focus(), 100);
  }, [step]);

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (i === 5 && v && next.every((d) => d)) {
      setTimeout(() => setStep("success"), 400);
    }
  }

  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-md mx-auto">
        <PixelCard tone="paper" className="scanlines">
          <div className="text-center mb-6">
            <PixelBadge tone="gold" className="mb-3">★ PLAYER LOGIN ★</PixelBadge>
            <h1 className="font-pixel text-lg md:text-xl">
              {step === "email" && "ENTER EMAIL"}
              {step === "code" && "ENTER CODE"}
              {step === "success" && "YOU'RE IN"}
            </h1>
          </div>

          {step === "email" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setStep("code");
              }}
              className="space-y-4"
            >
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-center focus:outline-none"
              />
              <PixelButton type="submit" variant="primary" size="lg" className="w-full">
                Send Code →
              </PixelButton>
              <p className="font-mono-pixel text-base text-center text-muted-foreground">
                No password. We'll email you a 6-digit code.
              </p>
            </form>
          )}

          {step === "code" && (
            <div className="space-y-5">
              <p className="font-mono-pixel text-base text-center text-muted-foreground">
                We sent a code to <span className="text-ink">{email}</span>
              </p>
              <div className="flex justify-center gap-2">
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                    }}
                    className="w-10 h-12 md:w-12 md:h-14 text-center font-pixel text-lg pixel-border-sm bg-card focus:outline-none focus:bg-gold"
                  />
                ))}
              </div>
              <button
                onClick={() => { setCode(["","","","","",""]); setStep("email"); }}
                className="w-full font-pixel text-[10px] uppercase text-muted-foreground hover:text-ink"
              >
                ← Use a different email
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="text-center space-y-5 py-4">
              <div className="text-5xl animate-pixel-float">★</div>
              <p className="font-mono-pixel text-xl">Welcome back, player.</p>
              <Link href="/"><PixelButton variant="accent" size="lg" className="w-full">Continue</PixelButton></Link>
            </div>
          )}
        </PixelCard>

        <p className="text-center font-mono-pixel text-base text-muted-foreground mt-6">
          New here? <Link href="/audit" className="underline">Book a free audit →</Link>
        </p>
      </section>
    </PixelLayout>
  );
}
