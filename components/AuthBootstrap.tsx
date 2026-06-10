"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export default function AuthBootstrap() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [allowGuest, setAllowGuest] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setTab("signup");
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
    setSuccess(null);

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

      // Check if session was created (implies auto-confirm is enabled)
      if (data.session) {
        setSession(data.session);
        sessionStorage.setItem("mailcheck:dismissed-auth", "true");
        setIsOpen(false);
      } else {
        setSuccess("Account created! Please check your email to verify your address.");
        // Clear fields
        setFullName("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Sign In (Log In)
  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setSuccess(null);

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
      sessionStorage.setItem("mailcheck:dismissed-auth", "true");
      setIsOpen(false);
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
    setSuccess(null);
    setLoading(true);
    try {
      const { data, error: guestError } = await supabase.auth.signInAnonymously();
      if (guestError) throw guestError;

      setSession(data.session);
      sessionStorage.setItem("mailcheck:dismissed-auth", "true");
      setIsOpen(false);
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
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>{tab === "signup" ? "Create your account" : "Sign in to MailCheck"}</h2>
        <p className="subtitle">
          {tab === "signup"
            ? "Create an account to save your scan history, customize checks, and get tailored AI advice."
            : "Sign back in to retrieve your audit history and linter drafts."}
        </p>

        {error && <div className="err" style={{ marginBottom: 16, textAlign: "center" }}>{error}</div>}
        {success && <div className="finding ok" style={{ marginBottom: 16, textAlign: "center" }}>{success}</div>}

        <form onSubmit={tab === "signup" ? handleSignUp : handleLogIn} className="auth-form">
          {tab === "signup" && (
            <div className="auth-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "15px",
                outline: "none"
              }}
            />
          </div>

          <div className="auth-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "15px",
                outline: "none"
              }}
            />
          </div>

          <button type="submit" className="primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
            {loading ? <span className="spinner" /> : tab === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-toggle">
          {tab === "signup" ? (
            <span>
              Already have an account?
              <button onClick={() => { setTab("login"); setError(null); setSuccess(null); }}>Log In</button>
            </span>
          ) : (
            <span>
              Don't have an account?
              <button onClick={() => { setTab("signup"); setError(null); setSuccess(null); }}>Create Account</button>
            </span>
          )}
        </div>

        {allowGuest && (
          <div className="auth-guest">
            <button onClick={handleGuest} disabled={loading}>
              Continue as Guest (Anonymous)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
