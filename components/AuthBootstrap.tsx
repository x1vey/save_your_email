"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { PixelButton } from "@/components/pixel/PixelButton";
import { toast } from "sonner";

export default function AuthBootstrap() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"signup" | "login" | "forgot">("login");
  const [allowGuest, setAllowGuest] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    setConfigured(true);

    // Initial check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Global event listener to trigger modal open (e.g. upgrade from header)
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const allowGuestVal = customEvent.detail?.allowGuest !== false;
      setAllowGuest(allowGuestVal);
      setTab("login");
      setIsOpen(true);
    };
    window.addEventListener("open-auth-modal", handleOpen);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("open-auth-modal", handleOpen);
    };
  }, [supabase]);

  // Handle Create Account (Sign Up)
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill out all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
        setSession(data.session);
        setIsOpen(false);
        toast.success("Account created successfully!");
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

  // Handle Sign In (Log In)
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setSession(data.session);
      setIsOpen(false);
      toast.success("Welcome back!");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Forgot Password
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

  // Handle Guest fallback (Sign in anonymously)
  async function handleGuest() {
    if (!supabase) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error: guestError } = await supabase.auth.signInAnonymously();
      if (guestError) throw guestError;

      setSession(data.session);
      setIsOpen(false);
      toast.success("Playing as Guest");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // If DB auth is checking initially, or if Supabase isn't configured, do not block the screen
  if (checking || !configured || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <PixelCard tone="sky" className="relative shadow-2xl shadow-ink/50 border-4 border-ink">
          
          {/* Close button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute -top-4 -right-4 w-10 h-10 bg-hazard border-4 border-ink font-pixel text-paper hover:scale-110 transition-transform flex items-center justify-center z-10"
          >
            X
          </button>

          <div className="text-center mb-6">
            <PixelBadge tone={tab === "login" ? "gold" : tab === "signup" ? "sky" : "hazard"} className="mb-3">
              ★ {tab === "login" ? "PLAYER LOGIN" : tab === "signup" ? "NEW PLAYER" : "PASSWORD RECOVERY"} ★
            </PixelBadge>
            <h2 className="font-pixel text-lg md:text-xl text-ink uppercase mt-2">
              {tab === "login" ? "Sign In to Continue" : tab === "signup" ? "Create Account" : "Forgot Password"}
            </h2>
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
                  type="text"
                  placeholder="Player One"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pixel-border-sm bg-paper px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
                />
              </div>
            )}

            <div>
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2">EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="player@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pixel-border-sm bg-paper px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
              />
            </div>

            {tab !== "forgot" && (
              <div>
                <label className="font-pixel text-[10px] text-muted-foreground block mb-2">PASSWORD</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pixel-border-sm bg-paper px-4 py-3 font-mono-pixel text-lg text-ink focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
                />
              </div>
            )}

            <div className="pt-2">
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

            {allowGuest && tab !== "forgot" && (
              <div>
                <button 
                  onClick={handleGuest} 
                  disabled={loading}
                  className="font-pixel text-[10px] uppercase text-sky hover:underline"
                >
                  ► Continue as Guest
                </button>
              </div>
            )}
          </div>

        </PixelCard>
      </div>
    </div>
  );
}
