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
  const [tab, setTab] = useState<"signup" | "login" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        toast.success("Account created successfully!");
        router.push("/");
      } else {
        toast.success("Account created! Please check your email to verify.");
        setTab("login");
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setError("Email already exists. Please log in or click Forgot Password.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;

      toast.success("Password reset link sent to your email!");
      setTab("login");
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
            <PixelBadge tone={tab === "login" ? "gold" : tab === "signup" ? "sky" : "hazard"} className="mb-3">
              ★ {tab === "login" ? "PLAYER LOGIN" : tab === "signup" ? "NEW PLAYER" : "PASSWORD RECOVERY"} ★
            </PixelBadge>
            <h1 className="font-pixel text-lg md:text-xl mt-2">
              {tab === "login" ? "ENTER CREDENTIALS" : tab === "signup" ? "CREATE ACCOUNT" : "FORGOT PASSWORD"}
            </h1>
            <p className="font-mono-pixel text-base text-muted-foreground mt-2">
              {tab === "login" 
                ? "Access your saved scans and drafts." 
                : tab === "signup" 
                ? "Save your progress and get custom advice."
                : "Enter your email to receive a reset link."}
            </p>
          </div>

          {error && (
            <div className="bg-hazard/20 border-2 border-hazard text-hazard p-3 font-mono-pixel text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={tab === "signup" ? handleSignUp : tab === "forgot" ? handleForgotPassword : handleLogIn} className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="font-pixel text-[10px] text-muted-foreground block mb-2">FULL NAME</label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Player One"
                  className="w-full pixel-border-sm bg-card px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
                />
              </div>
            )}
            
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
            
            {tab !== "forgot" && (
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
            )}

            <div className="pt-4">
              <PixelButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? "CONNECTING..." : tab === "login" ? "LOGIN ►" : tab === "signup" ? "JOIN ►" : "SEND LINK ►"}
              </PixelButton>
            </div>
          </form>

          <div className="mt-6 space-y-4 text-center">
            {tab !== "forgot" && (
              <button 
                onClick={() => { setTab("forgot"); setError(null); }}
                className="font-pixel text-[10px] uppercase text-muted-foreground hover:text-ink hover:underline block w-full"
              >
                Forgot Password?
              </button>
            )}

            <button 
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(null); }}
              className="font-pixel text-[10px] uppercase text-muted-foreground hover:text-ink hover:underline"
            >
              {tab === "login" ? "Need an account? Sign Up" : tab === "signup" ? "Already playing? Log In" : "Back to Login"}
            </button>
          </div>

        </PixelCard>
      </section>
    </PixelLayout>
  );
}
