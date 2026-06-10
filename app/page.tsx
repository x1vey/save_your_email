"use client";

import { useState, useEffect } from "react";
import type { Answers, Question, ScanResult, ReportResponse, TriageResult } from "@/lib/types";
import { QUESTIONS, getSlot } from "@/lib/questions";
import Markdown from "@/components/Markdown";
import LintPanel from "@/components/LintPanel";
import { createClient } from "@/lib/supabase/client";

type Stage = "intro" | "scanning" | "scan" | "problem" | "triaging" | "questions" | "generating" | "report";
type Mode = "diagnose" | "lint";

const MAX_Q = 8;

const EMAIL_FACTS = [
  "Did you know Gmail warns senders whose complaint rate exceeds 0.1%?",
  "Email deliverability is a credit balance problem. Every sending decision either builds or spends credit.",
  "A single hard bounce should be removed immediately. Repeatedly sending to dead addresses is a major spam trigger.",
  "Sending marketing emails from a subdomain (like mail.yourdomain.com) protects your root domain's reputation.",
  "If your domain is less than 4 weeks old, it has zero reputation. You must warm it up gradually.",
  "Click tracking rewrites links through a tracking domain. On a new or damaged domain, turn tracking off to boost placement.",
  "Google and Yahoo limit hard bounce rates to under 0.5% for bulk senders.",
  "A reply is the strongest positive engagement signal, indicating a real, wanted conversation.",
  "Apple MPP (Mail Privacy Protection) causes false opens. Click and reply rates are more reliable signals than open rates."
];

function scoreColor(s: number) {
  if (s >= 80) return "#34d399";
  if (s >= 55) return "#fbbf24";
  return "#f87171";
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("diagnose");
  const [stage, setStage] = useState<Stage>("intro");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [user, setUser] = useState<any>(null);

  // Layer 2: free-text problem statement.
  const [problemStatement, setProblemStatement] = useState("");

  // Triage result: ordered slot IDs from Call 1.
  const [triageSlots, setTriageSlots] = useState<string[]>([]);

  // Local question stepper (no per-question API calls).
  const [qIndex, setQIndex] = useState(0);

  // Overhaul states
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [factIndex, setFactIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [leadEmail, setLeadEmail] = useState("");
  const [leadEmailId, setLeadEmailId] = useState("");

  useEffect(() => {
    if (stage === "scanning" || stage === "triaging" || stage === "generating") {
      const interval = setInterval(() => {
        setFactIndex((prev) => (prev + 1) % EMAIL_FACTS.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync leadEmail to profile test_email column when user becomes authenticated
  useEffect(() => {
    if (user && !user.is_anonymous && leadEmail) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from("profiles")
          .update({ test_email: leadEmail })
          .eq("id", user.id)
          .then(
            () => {
              console.log("Updated test_email with leadEmail", leadEmail);
            },
            (err) => {
              console.error("Failed to update test_email", err);
            }
          );
      }
    }
  }, [user, leadEmail]);

  async function handleLogout() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    sessionStorage.removeItem("mailcheck:dismissed-auth");
  }

  function handleUpgrade() {
    sessionStorage.removeItem("mailcheck:dismissed-auth");
    window.dispatchEvent(new Event("open-auth-modal"));
  }

  // --- DNS Scan (Layer 1) ---
  async function runScan() {
    setError(null);
    if (!domain.trim()) return;
    setStage("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScan(data);
      if (data.leadEmail) {
        setLeadEmail(data.leadEmail);
      }
      if (data.leadEmailId) {
        setLeadEmailId(data.leadEmailId);
      }
      setStage("scan");
    } catch (e) {
      setError((e as Error).message);
      setStage("intro");
    }
  }

  // --- Transition from scan results to Layer 2 (problem statement) ---
  function startProblemStep() {
    const isRealUser = user && !user.is_anonymous;
    if (isRealUser) {
      setProblemStatement("");
      setStage("problem");
    } else {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
    }
  }

  // --- Triage (Call 1) ---
  async function runTriage() {
    if (!scan) return;
    setStage("triaging");
    setError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan, problemStatement }),
      });
      const data = (await res.json()) as TriageResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Triage failed");

      const slots = (data.slotIds || []).slice(0, MAX_Q);
      setTriageSlots(slots);
      setAnswers({});
      setQIndex(0);
      setStage("questions");
    } catch (e) {
      setError((e as Error).message);
      setStage("problem");
    }
  }

  // --- Local question stepping (no API calls) ---
  const currentSlotId = triageSlots[qIndex];
  const current: Question | undefined = currentSlotId ? getSlot(currentSlotId) : undefined;

  useEffect(() => {
    if (current) {
      setTypedAnswer((answers[current.id] as string) || "");
    }
  }, [current, answers]);

  function handleTextareaChange(val: string) {
    setTypedAnswer(val);
    setAnswers((prev) => ({ ...prev, [current!.id]: val }));
  }

  function answerCurrent(value: string) {
    if (!current) return;
    setAnswers((prev) => {
      if (current.type === "multi") {
        const arr = Array.isArray(prev[current.id]) ? [...(prev[current.id] as string[])] : [];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(value);
        return { ...prev, [current.id]: arr };
      }
      return { ...prev, [current.id]: value };
    });
  }

  function nextQuestion() {
    if (qIndex + 1 >= triageSlots.length) {
      // All questions answered → generate report.
      generateReport(scan!, answers);
    } else {
      setQIndex(qIndex + 1);
    }
  }

  function prevQuestion() {
    if (qIndex === 0) {
      setStage("problem");
      return;
    }
    setQIndex(qIndex - 1);
  }

  // --- Diagnosis (Call 2) ---
  async function generateReport(scanData: ScanResult, answerMap: Answers) {
    setStage("generating");
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan: scanData, answers: answerMap, problemStatement, triageSlots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report failed");
      setReport(data);
      setStage("report");
    } catch (e) {
      setError((e as Error).message);
      setStage("questions");
    }
  }

  function reset() {
    setStage("intro");
    setScan(null);
    setAnswers({});
    setTriageSlots([]);
    setQIndex(0);
    setProblemStatement("");
    setReport(null);
    setError(null);
    setTypedAnswer("");
    setFollowUpAnswers({});
    setShowOnboarding(true);
    setLeadEmail("");
    setLeadEmailId("");
  }

  const isAnswered = current
    ? typeof answers[current.id] === "string" && (answers[current.id] as string).trim().length > 0
    : false;

  return (
    <main className="wrap">
      <div className="header-row">
        <div className="brand">
          <span className="dot" /> MailCheck
        </div>
        {user && (
          <div className="user-menu">
            {user.is_anonymous ? (
              <>
                <span className="user-name" style={{ color: "var(--muted)" }}>Guest Mode</span>
                <button className="upgrade-btn" onClick={handleUpgrade}>
                  Create Account
                </button>
              </>
            ) : (
              <>
                <span className="user-name">Hello, {user.user_metadata?.full_name || user.email}</span>
                <button className="logout-btn" onClick={handleLogout}>
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab ${mode === "diagnose" ? "active" : ""}`}
          onClick={() => setMode("diagnose")}
        >
          Diagnose domain
        </button>
        <button
          className={`tab ${mode === "lint" ? "active" : ""}`}
          onClick={() => {
            const isRealUser = user && !user.is_anonymous;
            if (isRealUser) {
              setMode("lint");
            } else {
              window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
            }
          }}
        >
          Filter spam words
        </button>
      </div>

      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-card">
            <h2>What are you looking for today?</h2>
            <p>Select an option below to optimize your email deliverability or clean up your copy.</p>
            <div className="onboarding-options">
              <div
                className="onboarding-opt"
                onClick={() => {
                  setShowOnboarding(false);
                  const isRealUser = user && !user.is_anonymous;
                  if (isRealUser) {
                    setMode("lint");
                  } else {
                    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
                  }
                }}
              >
                <div className="onboarding-opt-content">
                  <h4>Email copy refinement</h4>
                  <p>Check if your copy triggers spam filters before sending.</p>
                </div>
                <div className="onboarding-opt-arrow">→</div>
              </div>

              <div
                className="onboarding-opt"
                onClick={() => {
                  setShowOnboarding(false);
                  setMode("diagnose");
                  setTimeout(() => {
                    const input = document.querySelector('input[placeholder="Enter your email to check DMARC score"]') as HTMLInputElement;
                    if (input) input.focus();
                  }, 100);
                }}
              >
                <div className="onboarding-opt-content">
                  <h4>Diagnose my email</h4>
                  <p>Check SPF, DKIM, and DMARC alignment for your domain.</p>
                </div>
                <div className="onboarding-opt-arrow">→</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "lint" && <LintPanel />}

      {mode === "diagnose" && stage === "intro" && (
        <>
          <h1>Why are your emails landing in spam?</h1>
          <p className="lede">
            Enter your sending email address. We&apos;ll run a live scan of your SPF, DKIM, DMARC and MX
            records, then ask a few quick questions about how you send — and hand you a prioritized,
            plain-English fix list.
          </p>
          <div className="card">
            <div className="row">
              <input
                type="text"
                placeholder="Enter your email to check DMARC score"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runScan()}
              />
              <button className="primary" onClick={runScan} disabled={!domain.trim()}>
                Scan domain
              </button>
            </div>
            <p className="muted-note">
              We only read public DNS records. Nothing is sent on your behalf and no login is required.
            </p>
          </div>
          {error && <div className="err">{error}</div>}
        </>
      )}

      {mode === "diagnose" && stage === "scanning" && (
        <div className="card" style={{ marginTop: 40 }}>
          <h1 style={{ fontSize: 24, textAlign: "center" }}>
            <span className="spinner" /> &nbsp;Scanning {domain.includes("@") ? domain.split("@")[1] : domain}…
          </h1>
          <p className="lede" style={{ marginBottom: 20, textAlign: "center" }}>
            Resolving MX, SPF, DKIM and DMARC records from public DNS.
          </p>
          
          <div className="email-animation">
            <div className="envelope">
              <div className="letter" />
            </div>
          </div>

          <div className="loading-carousel">
            <div className="fact-title">Deliverability Fact</div>
            <div className="fact-text" key={factIndex}>{EMAIL_FACTS[factIndex]}</div>
          </div>
        </div>
      )}

      {mode === "diagnose" && stage === "scan" && scan && (
        <>
          <h1 style={{ fontSize: 28 }}>
            Scan results for {scan.domain}
            {scan.esp && <span className="tag">{scan.esp.name}</span>}
          </h1>
          <div className="scoreband">
            <div
              className="scorecircle"
              style={{ border: `4px solid ${scoreColor(scan.techScore)}`, color: scoreColor(scan.techScore) }}
            >
              {scan.techScore}
            </div>
            <div className="scoremeta">
              Technical (authentication) score from DNS alone. Describe your problem next so we can
              ask the right questions and write your fix plan.
            </div>
          </div>

          {scan.findings.map((f) => (
            <div key={f.id} className={`finding ${f.severity}`}>
              <h4>
                {f.title}
                <span className={`badge ${f.severity}`}>{f.severity}</span>
              </h4>
              <p>{f.detail}</p>
              {f.fix && (
                <p style={{ marginTop: 8 }}>
                  <strong style={{ color: "var(--text)" }}>Fix:</strong> {f.fix}
                </p>
              )}
              {f.evidence && <pre>{f.evidence}</pre>}
            </div>
          ))}

          <div className="steps">
            <button className="ghost" onClick={reset}>
              ← Scan another
            </button>
            <button className="primary" onClick={startProblemStep}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* Layer 2: Free-text problem statement */}
      {mode === "diagnose" && stage === "problem" && (
        <>
          <h1 style={{ fontSize: 28 }}>What problem are you seeing?</h1>
          <p className="lede">
            Describe the deliverability issue you&apos;re experiencing — or leave blank if you just
            want a general health check. This helps us ask the right follow-up questions.
          </p>
          <div className="card">
            <textarea
              className="problem-input"
              rows={4}
              placeholder="e.g. My open rates dropped from 40% to 2% overnight, or I'm setting up a new domain for marketing emails…"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
            />
            <div className="steps" style={{ marginTop: 16 }}>
              <button className="ghost" onClick={() => setStage("scan")}>
                ← Back to scan
              </button>
              <button className="primary" onClick={runTriage}>
                Continue →
              </button>
            </div>
          </div>
          {error && <div className="err">{error}</div>}
        </>
      )}

      {mode === "diagnose" && stage === "triaging" && (
        <div className="card" style={{ marginTop: 40 }}>
          <h1 style={{ fontSize: 24 }}>
            <span className="spinner" /> &nbsp;Analyzing your situation…
          </h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            Deciding which diagnostic questions to ask based on your scan and problem.
          </p>
          <div className="loading-carousel">
            <div className="fact-title">Deliverability Fact</div>
            <div className="fact-text" key={factIndex}>{EMAIL_FACTS[factIndex]}</div>
          </div>
        </div>
      )}

      {mode === "diagnose" && stage === "questions" && current && (
        <>
          <div className="progress">
            <div style={{ width: `${((qIndex + 1) / triageSlots.length) * 100}%` }} />
          </div>
          <div className="q">
            <div className="qtext">{current.text}</div>
            {current.help && <div className="qhelp">{current.help}</div>}
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <textarea
              rows={4}
              placeholder="Type your answer here..."
              value={typedAnswer}
              onChange={(e) => handleTextareaChange(e.target.value)}
              style={{ width: "100%", fontFamily: "inherit" }}
            />
            {current.options && current.options.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>
                  Suggestions (click to fill):
                </div>
                <div className="chips-container">
                  {current.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`chip ${typedAnswer === opt.label ? "active" : ""}`}
                      onClick={() => handleTextareaChange(opt.label)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="steps">
            <button className="ghost" onClick={prevQuestion}>
              ← Back
            </button>
            <button className="primary" onClick={nextQuestion} disabled={!isAnswered}>
              {qIndex + 1 >= triageSlots.length ? "Finish" : "Next →"}
            </button>
          </div>
          <p className="muted-note">
            Question {qIndex + 1} of {triageSlots.length} · Free-form input (describe in your own words)
          </p>
        </>
      )}

      {mode === "diagnose" && stage === "generating" && (
        <div className="card" style={{ marginTop: 40 }}>
          <h1 style={{ fontSize: 24 }}>
            <span className="spinner" /> &nbsp;Writing your fix plan…
          </h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            Combining the DNS scan with your answers and prioritizing the fixes.
          </p>
          <div className="loading-carousel">
            <div className="fact-title">Deliverability Fact</div>
            <div className="fact-text" key={factIndex}>{EMAIL_FACTS[factIndex]}</div>
          </div>
        </div>
      )}

      {mode === "diagnose" && stage === "report" && report && report.status === "inconclusive" && report.followUpQuestions && (
        <>
          <h1 style={{ fontSize: 28 }}>Clarifying Details Needed</h1>
          <p className="lede">
            Based on your answers, we need a few more details to generate your custom action plan.
          </p>
          <div className="card">
            {report.followUpQuestions.map((q) => (
              <div key={q.id} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{q.text}</div>
                {q.help && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>{q.help}</div>}
                <textarea
                  rows={3}
                  placeholder="Type your answer here..."
                  value={followUpAnswers[q.id] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFollowUpAnswers((prev) => ({ ...prev, [q.id]: val }));
                  }}
                  style={{ width: "100%", fontFamily: "inherit" }}
                />
              </div>
            ))}
            <div className="steps" style={{ marginTop: 24 }}>
              <button
                className="ghost"
                onClick={() => {
                  setReport(null);
                  setStage("questions");
                }}
              >
                ← Back
              </button>
              <button
                className="primary"
                disabled={
                  !report.followUpQuestions.every(
                    (q) => (followUpAnswers[q.id] || "").trim().length > 0
                  )
                }
                onClick={() => {
                  const combinedAnswers = { ...answers, ...followUpAnswers };
                  setAnswers(combinedAnswers);
                  generateReport(scan!, combinedAnswers);
                }}
              >
                Submit Answers & Generate Plan
              </button>
            </div>
          </div>
        </>
      )}

      {mode === "diagnose" && stage === "report" && report && report.status !== "inconclusive" && (
        <>
          <h1 style={{ fontSize: 28 }}>Your remediation plan</h1>
          <div className="scoreband">
            <div
              className="scorecircle"
              style={{ border: `4px solid ${scoreColor(report.finalScore)}`, color: scoreColor(report.finalScore) }}
            >
              {report.finalScore}
            </div>
            <div className="scoremeta">
              Overall deliverability score (technical + behavioral).{" "}
              {report.source === "fallback" && (
                <em>Generated with the built-in rules engine (no AI key configured).</em>
              )}
            </div>
          </div>
          <div className="card">
            <Markdown source={report.markdown || ""} />
          </div>
          <div className="steps">
            <button className="ghost" onClick={reset}>
              ← Start over
            </button>
            <button className="primary" onClick={() => window.print()}>
              Print / save PDF
            </button>
          </div>
        </>
      )}

      {error && stage !== "intro" && <div className="err">{error}</div>}
    </main>
  );
}
