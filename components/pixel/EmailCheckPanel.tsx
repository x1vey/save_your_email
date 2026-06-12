"use client";
import React, { useEffect, useRef, useState } from "react";
import { PixelButton } from "./PixelButton";
import { toast } from "sonner";
import { lintEmail, type LintHit } from "@/lib/spam-lint";

type Mode = "dmarc" | "spam";

interface Props {
  mode: Mode;
  onScan?: (domain: string) => void;
  isScanning?: boolean;
}

export function EmailCheckPanel({ mode, onScan, isScanning }: Props) {
  if (mode === "dmarc") return <DmarcBox onScan={onScan} isScanning={isScanning} />;
  return <SpamTerminal />;
}

function DmarcBox({ onScan, isScanning }: { onScan?: (domain: string) => void; isScanning?: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <div className="pixel-border-lg bg-card p-6 md:p-8 max-w-2xl mx-auto">
      <div className="font-pixel text-[10px] text-hazard mb-2">★ DMARC CHECK ★</div>
      <h3 className="font-pixel text-sm md:text-base mb-4">CHECK YOUR EMAIL</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onScan && email) onScan(email);
          }}
          placeholder="you@yourdomain.com"
          className="flex-1 font-mono-pixel text-xl px-4 py-3 bg-paper pixel-border-sm focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
        />
        <PixelButton
          variant="primary"
          size="lg"
          onClick={() => {
            if (!email.includes("@")) return toast.error("Enter a valid email");
            if (onScan) {
              onScan(email);
            } else {
              toast.success("DMARC scan queued — check your inbox in 90s");
            }
          }}
          disabled={isScanning}
        >
          {isScanning ? "SCANNING..." : "GO ►"}
        </PixelButton>
      </div>
      <p className="font-mono-pixel text-base text-muted-foreground mt-3">
        We'll inspect SPF, DKIM &amp; DMARC alignment for your domain.
      </p>
    </div>
  );
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
      <button className="text-gold font-pixel text-[10px] hover:underline uppercase" onClick={fetchRewrite}>
        ✨ Suggest AI fixes
      </button>
    );
  }

  if (loading) {
    return <div className="text-muted-foreground font-pixel text-[10px] uppercase animate-pulse">✨ Generating...</div>;
  }

  if (suggestions && suggestions.length > 0) {
    return (
      <div className="mt-2">
        <div className="font-pixel text-[8px] text-muted-foreground mb-2 uppercase">AI Suggestions (Click to apply):</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="px-2 py-1 bg-ink text-paper font-mono-pixel text-sm hover:bg-gold hover:text-ink transition-colors pixel-border-sm"
              onClick={() => onReplace(hit.startIndex!, hit.endIndex!, s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <div className="text-hazard font-pixel text-[8px] uppercase">No good alternatives found.</div>;
}

function SpamTerminal() {
  const [values, setValues] = useState({
    subject: "",
    copy: ""
  });

  const copyRef = useRef<HTMLTextAreaElement>(null);
  const copyBackdropRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const subjectBackdropRef = useRef<HTMLDivElement>(null);

  const handleCopyScroll = () => {
    if (copyRef.current && copyBackdropRef.current) {
      copyBackdropRef.current.scrollTop = copyRef.current.scrollTop;
      copyBackdropRef.current.scrollLeft = copyRef.current.scrollLeft;
    }
  };

  const handleSubjectScroll = () => {
    if (subjectRef.current && subjectBackdropRef.current) {
      subjectBackdropRef.current.scrollLeft = subjectRef.current.scrollLeft;
    }
  };

  const lintResult = lintEmail(values.subject, values.copy);
  const haystack = `${values.subject.trim()}\n${values.copy}`;

  const renderHighlighted = (text: string, globalOffset: number, hits: LintHit[]) => {
    if (!text) return null;
    
    const localHits = hits.filter(h => 
      h.startIndex !== undefined && h.endIndex !== undefined &&
      h.startIndex >= globalOffset && h.startIndex < globalOffset + text.length
    ).sort((a, b) => a.startIndex! - b.startIndex!);
  
    const mergedHits: { start: number, end: number, phrase: string }[] = [];
    for (const h of localHits) {
      const localStart = h.startIndex! - globalOffset;
      const localEnd = Math.min(h.endIndex! - globalOffset, text.length);
      if (mergedHits.length > 0) {
        const last = mergedHits[mergedHits.length - 1];
        if (localStart < last.end) {
          last.end = Math.max(last.end, localEnd);
          last.phrase = text.substring(last.start, last.end);
          continue;
        }
      }
      mergedHits.push({ start: localStart, end: localEnd, phrase: text.substring(localStart, localEnd) });
    }
  
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
  
    for (const hit of mergedHits) {
      if (hit.start > lastIndex) {
        parts.push(text.substring(lastIndex, hit.start));
      }
      parts.push(
        <span key={hit.start} className="bg-hazard/30 border-b-2 border-hazard rounded-sm">
          {hit.phrase}
        </span>
      );
      lastIndex = hit.end;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    if (text.endsWith('\n')) {
      parts.push(" ");
    }
  
    return parts;
  };

  const handleReplace = (start: number, end: number, suggestion: string) => {
    const subjLen = values.subject.trim().length;
    let newSubject = values.subject;
    let newCopy = values.copy;

    if (start <= subjLen) {
      newSubject = newSubject.substring(0, start) + suggestion + newSubject.substring(end);
    } else {
      const copyStart = start - subjLen - 1; // -1 for \n
      const copyEnd = end - subjLen - 1;
      newCopy = newCopy.substring(0, copyStart) + suggestion + newCopy.substring(copyEnd);
    }

    setValues({ subject: newSubject, copy: newCopy });
  };

  return (
    <div className="pixel-border-lg bg-card p-6 md:p-8 max-w-2xl mx-auto text-left">
      <div className="font-pixel text-[10px] text-hazard mb-4 text-center">★ LIVE SPAM CHECKER ★</div>
      
      <div className="space-y-6">
        <div>
          <label className="font-pixel text-[10px] text-muted-foreground block mb-2">SUBJECT LINE</label>
          <div className="relative bg-paper pixel-border-sm transition-transform focus-within:translate-x-[-2px] focus-within:translate-y-[-2px]">
            <div 
              ref={subjectBackdropRef}
              className="absolute inset-0 p-3 font-mono-pixel text-xl pointer-events-none whitespace-pre overflow-hidden text-ink"
              aria-hidden="true"
            >
              {values.subject ? renderHighlighted(values.subject, 0, lintResult.hits) : <span className="text-muted-foreground/50">🚀 Big news inside!!!</span>}
            </div>
            <input
              ref={subjectRef}
              type="text"
              value={values.subject}
              onChange={e => setValues(v => ({ ...v, subject: e.target.value }))}
              onScroll={handleSubjectScroll}
              className="relative w-full bg-transparent p-3 font-mono-pixel text-xl text-transparent focus:outline-none"
              style={{ caretColor: 'var(--ink)' }}
            />
          </div>
        </div>

        <div>
          <label className="font-pixel text-[10px] text-muted-foreground block mb-2">EMAIL COPY</label>
          <div className="relative bg-paper pixel-border-sm transition-transform focus-within:translate-x-[-2px] focus-within:translate-y-[-2px] h-48">
            <div 
              ref={copyBackdropRef}
              className="absolute inset-0 p-3 font-mono-pixel text-xl pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-ink"
              aria-hidden="true"
            >
              {values.copy ? renderHighlighted(values.copy, values.subject.trim().length + 1, lintResult.hits) : <span className="text-muted-foreground/50">Hi {"{{first_name}}"}, we have a special promotion...</span>}
            </div>
            <textarea
              ref={copyRef}
              value={values.copy}
              onChange={e => setValues(v => ({ ...v, copy: e.target.value }))}
              onScroll={handleCopyScroll}
              className="relative w-full h-full bg-transparent p-3 font-mono-pixel text-xl text-transparent focus:outline-none resize-none"
              style={{ caretColor: 'var(--ink)' }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-ink pixel-border-sm text-center mt-6">
          <div className="font-pixel text-xs text-gold mb-2">SPAMASSASSIN SCORE</div>
          <div className={`font-pixel text-4xl ${lintResult.verdict === 'good' ? 'text-crt-green' : lintResult.verdict === 'borderline' ? 'text-gold' : 'text-hazard'}`}>
            {lintResult.score.toFixed(1)} / {lintResult.threshold.toFixed(1)}
          </div>
          <div className="font-mono-pixel text-lg text-paper mt-2 uppercase">
            {lintResult.verdict === 'good' ? "Looks clean! Minor risk." : lintResult.verdict === 'borderline' ? "Warning: Approaching spam threshold." : "High risk! Inbox placement unlikely."}
          </div>
        </div>

        {lintResult.hits.length > 0 && (
          <div>
            <h3 className="font-pixel text-[10px] text-hazard mb-4">SPAM RULES TRIGGERED</h3>
            <div className="space-y-4">
              {lintResult.hits.map((h, idx) => (
                <div key={`${h.rule}-${idx}`} className="bg-paper p-4 pixel-border-sm border-l-4 border-l-hazard">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-pixel text-[10px] uppercase text-ink">{h.rule}</div>
                    <div className="font-pixel text-[10px] text-hazard bg-hazard/10 px-2 py-1">+{h.score.toFixed(1)}</div>
                  </div>
                  <p className="font-mono-pixel text-lg text-ink mb-1">{h.detail}</p>
                  <p className="font-mono-pixel text-lg text-muted-foreground mb-3">Fix: {h.advice}</p>
                  <RewriteSection hit={h} haystack={haystack} onReplace={handleReplace} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

