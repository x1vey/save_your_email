"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      toast.success("Welcome back, player.");
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PixelLayout>
      <section className="px-4 py-16 max-w-md mx-auto">
        <PixelCard tone="paper" className="scanlines">
          <div className="text-center mb-6">
            <PixelBadge tone="gold" className="mb-3">★ PLAYER LOGIN ★</PixelBadge>
            <h1 className="font-pixel text-lg md:text-xl">ENTER CREDENTIALS</h1>
          </div>

          {error && (
            <div className="bg-hazard/20 border-2 border-hazard text-hazard p-3 font-mono-pixel text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogIn} className="space-y-4">
            <div>
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2">EMAIL ADDRESS</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
              />
            </div>
            
            <div>
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2">PASSWORD</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
              />
            </div>

            <div className="pt-4">
              <PixelButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "CONNECTING..." : "LOGIN ►"}
              </PixelButton>
            </div>
          </form>

        </PixelCard>

        <p className="text-center font-mono-pixel text-base text-muted-foreground mt-6 flex flex-col gap-2">
          <span>New here? <Link href="/audit" className="underline hover:text-ink">Book a free audit</Link> or sign up when prompted.</span>
        </p>
      </section>
    </PixelLayout>
  );
}
