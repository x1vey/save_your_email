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
  }

  const isAnswered = current
    ? current.type === "multi"
      ? Array.isArray(answers[current.id]) && (answers[current.id] as string[]).length > 0
      : answers[current.id] !== undefined
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
          Lint an email
        </button>
      </div>

      {mode === "lint" && <LintPanel />}

      {mode === "diagnose" && stage === "intro" && (
        <>
          <h1>Why are your emails landing in spam?</h1>
          <p className="lede">
            Enter your sending domain. We&apos;ll run a live scan of your SPF, DKIM, DMARC and MX
            records, then ask a few quick questions about how you send — and hand you a prioritized,
            plain-English fix list.
          </p>
          <div className="card">
            <div className="row">
              <input
                type="text"
                placeholder="yourdomain.com"
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
          <h1 style={{ fontSize: 24 }}>
            <span className="spinner" /> &nbsp;Scanning {domain}…
          </h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            Resolving MX, SPF, DKIM and DMARC records from public DNS.
          </p>
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
          <div>
            {current.options?.map((opt) => {
              const sel =
                current.type === "multi"
                  ? Array.isArray(answers[current.id]) &&
                    (answers[current.id] as string[]).includes(opt.value)
                  : answers[current.id] === opt.value;
              return (
                <div
                  key={opt.value}
                  className={`opt ${sel ? "sel" : ""}`}
                  onClick={() => answerCurrent(opt.value)}
                >
                  <span className="mark">{sel ? "✓" : ""}</span>
                  {opt.label}
                </div>
              );
            })}
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
            Question {qIndex + 1} of {triageSlots.length} ·{" "}
            {current.type === "multi" ? "Select all that apply" : "Pick one"}
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
        </div>
      )}

      {mode === "diagnose" && stage === "report" && report && (
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
            <Markdown source={report.markdown} />
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
