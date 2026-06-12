"use client";
import React, { useEffect, useRef, useState } from "react";
import { PixelButton } from "./PixelButton";
import { toast } from "sonner";
import type { FullSpamScanResult, FullSpamScanHit } from "@/lib/llm";

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

function SpamTerminal() {
  const [values, setValues] = useState({
    subject: "",
    copy: ""
  });
  const [scanResult, setScanResult] = useState<FullSpamScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

  useEffect(() => {
    const { subject, copy } = values;
    if (!subject.trim() && !copy.trim()) {
      setScanResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsScanning(true);
      try {
        const res = await fetch("/api/spamcheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, copy }),
        });
        if (res.ok) {
          const data = await res.json();
          setScanResult(data);
        }
      } catch (err) {
        console.error("Scan failed", err);
      } finally {
        setIsScanning(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [values.subject, values.copy]);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderHighlighted = (text: string, hits: FullSpamScanHit[] | undefined) => {
    if (!text) return null;
    if (!hits || hits.length === 0) return text;
    
    let parts: React.ReactNode[] = [text];
    
    // Sort hits by length descending to match longer phrases first
    const sortedHits = [...hits].sort((a, b) => b.phrase.length - a.phrase.length);

    sortedHits.forEach((hit, hitIdx) => {
      const newParts: React.ReactNode[] = [];
      const escaped = escapeRegExp(hit.phrase);
      const regex = new RegExp(`(${escaped})`, 'gi');
      
      parts.forEach(part => {
        if (typeof part === 'string') {
          const split = part.split(regex);
          split.forEach((s, i) => {
            if (s.toLowerCase() === hit.phrase.toLowerCase()) {
              newParts.push(
                <span key={`${hitIdx}-${i}`} className="bg-hazard/30 border-b-2 border-hazard rounded-sm" title={hit.rule}>
                  {s}
                </span>
              );
            } else if (s) {
              newParts.push(s);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    if (text.endsWith('\n')) {
      parts.push(" ");
    }
  
    return parts;
  };

  const applyAiFixes = () => {
    if (!scanResult) return;
    setValues({
      subject: scanResult.rewrittenSubject || values.subject,
      copy: scanResult.rewrittenCopy || values.copy,
    });
    setScanResult(null);
    toast.success("AI Fixes Applied!");
  };

  return (
    <div className="pixel-border-lg bg-card p-6 md:p-8 max-w-2xl mx-auto text-left">
      <div className="font-pixel text-[10px] text-hazard mb-4 text-center flex items-center justify-center gap-2">
        ★ LIVE SPAM CHECKER ★ {isScanning && <span className="animate-pulse text-gold">SCANNING...</span>}
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="font-pixel text-[10px] text-muted-foreground block mb-2">SUBJECT LINE</label>
          <div className="relative bg-paper pixel-border-sm transition-transform focus-within:translate-x-[-2px] focus-within:translate-y-[-2px]">
            <div 
              ref={subjectBackdropRef}
              className="absolute inset-0 p-3 font-mono-pixel text-xl pointer-events-none whitespace-pre overflow-hidden text-ink"
              aria-hidden="true"
            >
              {values.subject ? renderHighlighted(values.subject, scanResult?.hits) : <span className="text-muted-foreground/50">🚀 Big news inside!!!</span>}
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
              {values.copy ? renderHighlighted(values.copy, scanResult?.hits) : <span className="text-muted-foreground/50">Hi {"{{first_name}}"}, we have a special promotion...</span>}
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
          <div className={`font-pixel text-4xl ${!scanResult ? 'text-muted-foreground' : scanResult.verdict === 'good' ? 'text-crt-green' : scanResult.verdict === 'borderline' ? 'text-gold' : 'text-hazard'}`}>
            {scanResult ? scanResult.score.toFixed(1) : "0.0"} / 5.0
          </div>
          <div className="font-mono-pixel text-lg text-paper mt-2 uppercase">
            {!scanResult ? "Ready to scan" : scanResult.verdict === 'good' ? "Looks clean! Minor risk." : scanResult.verdict === 'borderline' ? "Warning: Approaching spam threshold." : "High risk! Inbox placement unlikely."}
          </div>
        </div>

        {scanResult && scanResult.hits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-pixel text-[10px] text-hazard">SPAM RULES TRIGGERED</h3>
              <PixelButton variant="primary" size="sm" onClick={applyAiFixes}>
                ✨ APPLY AI FIXES
              </PixelButton>
            </div>
            <div className="space-y-4">
              {scanResult.hits.map((h, idx) => (
                <div key={`${h.rule}-${idx}`} className="bg-paper p-4 pixel-border-sm border-l-4 border-l-hazard">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-pixel text-[10px] uppercase text-ink">{h.rule}</div>
                    <div className="font-pixel text-[10px] text-hazard bg-hazard/10 px-2 py-1">+{h.score.toFixed(1)}</div>
                  </div>
                  <p className="font-mono-pixel text-lg text-ink mb-1">"{h.phrase}"</p>
                  <p className="font-mono-pixel text-lg text-muted-foreground">Detail: {h.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
