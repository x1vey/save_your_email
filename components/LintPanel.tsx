"use client";

import { useState } from "react";
import type { LintResult, LintHit } from "@/lib/spam-lint";

const SAMPLE_SUBJECT = "ACT NOW!! 100% GUARANTEED — Dear Winner, claim your million dollars";
const SAMPLE_BODY =
  "Dear Friend,\n\nCongratulations, you have won! This is a risk-free, limited time offer. " +
  "Click here http://bit.ly/abc to buy now and earn extra income FAST!!!";

function verdictColor(v: LintResult["verdict"]) {
  return v === "good" ? "#34d399" : v === "borderline" ? "#fbbf24" : "#f87171";
}
function sevColor(s: string) {
  return s === "critical" || s === "high" ? "#f87171" : s === "medium" ? "#fbbf24" : "#8a97a8";
}

function RewriteSection({
  hit,
  haystack,
  onReplace,
}: {
  hit: LintHit;
  haystack: string;
  onReplace: (start: number, end: number, suggestion: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  if (hit.startIndex === undefined || hit.endIndex === undefined || !hit.phrase) return null;

  async function fetchRewrite() {
    setLoading(true);
    try {
      // Find sentence context by expanding to nearest periods
      let ctxStart = hit.startIndex || 0;
      while (ctxStart > 0 && !/[.!?\n]/.test(haystack[ctxStart - 1])) ctxStart--;
      let ctxEnd = hit.endIndex || 0;
      while (ctxEnd < haystack.length && !/[.!?\n]/.test(haystack[ctxEnd])) ctxEnd++;
      
      const surroundingContext = haystack.substring(ctxStart, ctxEnd).trim();

      const res = await fetch("/api/spamcheck/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flaggedPhrase: hit.phrase,
          rule: hit.rule,
          surroundingContext,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  if (!suggestions && !loading) {
    return (
      <button className="ghost" style={{ marginTop: 8, fontSize: "0.85em" }} onClick={fetchRewrite}>
        ✨ Suggest alternatives
      </button>
    );
  }

  if (loading) {
    return <div style={{ marginTop: 8, fontSize: "0.85em", color: "var(--muted)" }}>✨ Generating alternatives...</div>;
  }

  if (suggestions && suggestions.length > 0) {
    return (
      <div style={{ marginTop: 12 }}>
        <strong style={{ fontSize: "0.85em", color: "var(--text)" }}>AI Suggestions (click to apply):</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="ghost"
              style={{ fontSize: "0.85em", background: "rgba(255,255,255,0.05)" }}
              onClick={() => onReplace(hit.startIndex!, hit.endIndex!, s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function LintPanel() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<LintResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runWithData(subj: string, bdy: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subj, body: bdy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lint failed");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    await runWithData(subject, body);
  }

  function handleReplace(start: number, end: number, suggestion: string) {
    const subjLen = subject.length;
    let newSubject = subject;
    let newBody = body;

    if (start <= subjLen) {
      // It's in the subject
      newSubject = subject.substring(0, start) + suggestion + subject.substring(end);
    } else {
      // It's in the body
      const bodyStart = start - subjLen - 1; // -1 for the \n delimiter
      const bodyEnd = end - subjLen - 1;
      newBody = body.substring(0, bodyStart) + suggestion + body.substring(bodyEnd);
    }

    setSubject(newSubject);
    setBody(newBody);
    
    // Automatically re-run lint
    runWithData(newSubject, newBody);
  }

  // Meter fill: score relative to the 5.0 spam threshold (capped at 100%).
  const fill = result ? Math.min(100, (result.score / result.threshold) * 100) : 0;

  return (
    <>
      <h1 style={{ fontSize: 30 }}>Spam-score a draft before you send</h1>
      <p className="lede">
        Paste a subject and body. We apply a SpamAssassin-style rule set (real rule scores from the
        knowledge base) and add them up. Spam threshold is <strong>5.0</strong>; aim for under{" "}
        <strong>2.0</strong>.
      </p>

      <div className="card">
        <input
          type="text"
          placeholder="Subject line"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <textarea
          placeholder="Paste the email body (plain text or HTML)…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
        />
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <button
            className="ghost"
            onClick={() => {
              setSubject(SAMPLE_SUBJECT);
              setBody(SAMPLE_BODY);
              setResult(null);
            }}
          >
            Load a spammy example
          </button>
          <button className="primary" onClick={run} disabled={loading || (!subject.trim() && !body.trim())}>
            {loading ? <span className="spinner" /> : "Check email"}
          </button>
        </div>
        {error && <div className="err">{error}</div>}
      </div>

      {result && (
        <div style={{ marginTop: 24 }}>
          <div className="scoreband">
            <div
              className="scorecircle"
              style={{ border: `4px solid ${verdictColor(result.verdict)}`, color: verdictColor(result.verdict) }}
            >
              {result.score}
            </div>
            <div className="scoremeta">
              <strong style={{ color: verdictColor(result.verdict), textTransform: "uppercase" }}>
                {result.verdict}
              </strong>{" "}
              — spam threshold is {result.threshold}, target under {result.target}.
              {result.isHtml ? " Detected HTML content." : " Detected plain text."}
              <div className="progress" style={{ marginTop: 10 }}>
                <div
                  style={{
                    width: `${fill}%`,
                    background: verdictColor(result.verdict),
                  }}
                />
              </div>
            </div>
          </div>

          {result.hits.length === 0 ? (
            <div className="finding ok">
              <h4>No spam rules triggered 🎉</h4>
              <p>Nothing in this draft tripped the rule set. Still worth a real test via mail-tester.com before a big send.</p>
            </div>
          ) : (
            result.hits.map((h, idx) => (
              <div key={`${h.rule}-${idx}`} className="finding" style={{ borderLeftColor: sevColor(h.severity) }}>
                <h4>
                  {h.rule}
                  <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: sevColor(h.severity) }}>
                    +{h.score} · {h.severity}
                  </span>
                </h4>
                <p>{h.detail}</p>
                <p style={{ marginTop: 6 }}>
                  <strong style={{ color: "var(--text)" }}>Fix:</strong> {h.advice}
                </p>
                
                <RewriteSection 
                  hit={h} 
                  haystack={subject + "\n" + (result.isHtml ? body : body)} 
                  onReplace={handleReplace} 
                />
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
