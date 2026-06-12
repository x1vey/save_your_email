"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please fill out both fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully!");
      router.push("/login");
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
            <PixelBadge tone="sky" className="mb-3">
              ★ RECOVERY MODE ★
            </PixelBadge>
            <h1 className="font-pixel text-lg md:text-xl mt-2">NEW PASSWORD</h1>
            <p className="font-mono-pixel text-base text-muted-foreground mt-2">
              Enter your new credentials below.
            </p>
          </div>

          {error && (
            <div className="bg-hazard/20 border-2 border-hazard text-hazard p-3 font-mono-pixel text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2">NEW PASSWORD</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
              />
            </div>
            
            <div>
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2">CONFIRM PASSWORD</label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
              />
            </div>

            <div className="pt-4">
              <PixelButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "UPDATING..." : "UPDATE PASSWORD ►"}
              </PixelButton>
            </div>
          </form>
        </PixelCard>
      </section>
    </PixelLayout>
  );
}
