"use client";
import { useEffect, useRef, useState } from "react";
import { PixelButton } from "./PixelButton";
import { toast } from "sonner";

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

interface Line { kind: "out" | "prompt" | "input"; text: string }

const SPAM_WORDS = [
  "free", "guarantee", "guaranteed", "urgent", "winner", "winning", "risk-free", "risk free", 
  "click here", "buy now", "act now", "limited time", "special promotion", "congratulations", 
  "credit card", "$$$", "100% free", "save $", "cash bonus", "earn $", "no obligation", 
  "cancel at any time", "opportunity", "viagra", "pharmacy", "cheap", "discount", 
  "lowest price", "make money", "prize", "jackpot", "cash", "crypto", "bitcoin", "investment", 
  "double your", "earn per week", "fast cash", "income", "multi-level marketing", "no catch", 
  "passwords", "social security", "billing", "account suspended", "urgent action", "act immediately", 
  "dear friend", "order now", "apply now", "sign up free", "free trial", "bonus", "hidden charges", 
  "no cost", "promise", "unsecured credit", "work from home", "be your own boss", "additional income", 
  "earn extra cash", "lose weight", "miracle", "weight loss", "cure", "increase sales", "marketing", 
  "opt in", "traffic", "click below", "visit our website", "call now", "don't delete", "not spam", 
  "this isn't spam", "hidden", "secret", "selected", "claim", "reward", "clearance", "deal", 
  "bargain", "sale", "save big", "buy direct", "100% satisfied", "act immediately", "apply online", 
  "bargain", "best price", "boss", "can't live without", "cards accepted", "cents on the dollar", 
  "check or money order", "claims", "clearance", "compare rates", "credit bureaus", "dear", 
  "do it today", "don't hesitate", "earn", "easy terms", "eliminate debt", "exclusive deal", 
  "expect to earn", "fast cash", "financial freedom", "free access", "free consultation", 
  "free gift", "free hosting", "free info", "free investment", "free membership", "free preview", 
  "free quote", "full refund", "get it now", "get paid", "get started now", "great offer", 
  "guarantee", "increase sales", "increase traffic", "incredible deal", "info you requested", 
  "information you requested", "instant", "internet market", "join millions", "lifetime", 
  "loans", "lose", "lower rates", "lowest price", "luxury", "mail in order form", "marketing solution", 
  "mass email", "meet singles", "message contains", "million dollars", "miracle", "money back", 
  "mortgage rates", "multi-level marketing", "name brand", "new customers only", "no age restrictions", 
  "no credit check", "no disappointment", "no experience", "no fees", "no gimmick", "no hidden", 
  "no inventory", "no investment", "no medical", "no middleman", "no questions asked", "not intended", 
  "obligation", "off shore", "offer", "once in lifetime", "one time", "online biz opportunity", 
  "online degree", "online marketing", "online pharmacy", "open", "opportunity", "order status", 
  "orders shipped by", "outstanding values", "passwords", "pennies a day", "please read", 
  "potential earnings", "pre-approved", "price", "print form signature", "priority mail", "prize", 
  "problem", "produce traffic", "profit", "promise", "pure profit", "quote", "real thing", 
  "refinance", "removes wrinkles", "reverses aging", "risk-free", "sale", "satisfaction guaranteed", 
  "save big money", "save up to", "score with babes", "search engine", "search engines", "secret", 
  "see for yourself", "sent in compliance", "serious cash", "serious only", "shopper", "shopping spree", 
  "sign up free today", "social security number", "special promotion", "stainless steel", "stock alert", 
  "stock disclaimer", "stock pick", "stop snoring", "strong buy", "stuff on sale", "subject to credit", 
  "supplies are limited", "take action", "talks about hidden charges", "terms and conditions", 
  "the best rates", "the following form", "they keep your money", "they're just giving it away", 
  "this isn't a scam", "this isn't junk", "this isn't spam", "time limited", "trial", "undisclosed", 
  "unsecured credit", "unsecured debt", "urgent", "us dollars", "vacation", "vacation offers", 
  "valuable", "viagra", "vicodin", "visit our website", "warranty", "we hate spam", "web traffic", 
  "weight loss", "what are you waiting for", "while supplies last", "who really wins", "why pay more", 
  "wife", "win", "winner", "winning", "won", "work from home", "xanax", "you are a winner", "you have been selected"
];

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function SpamTerminal() {
  const [values, setValues] = useState({
    from: "",
    subject: "",
    preview: "",
    copy: ""
  });
  const [scanned, setScanned] = useState(false);
  const [score, setScore] = useState(100);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [saResult, setSaResult] = useState<{ score: string; rules: { score: string; description: string }[] } | null>(null);
  const [isScanningContent, setIsScanningContent] = useState(false);

  const handleScan = async () => {
    if (!values.copy.trim() && !values.subject.trim()) {
      toast.error("Please enter some email copy or subject line to scan.");
      return;
    }

    const textToScan = (values.subject + " " + values.copy).toLowerCase();
    const found: string[] = [];
    let penalties = 0;

    SPAM_WORDS.forEach(word => {
      const escaped = escapeRegExp(word);
      const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'gi');
      const matches = textToScan.match(regex);
      if (matches) {
        if (!found.includes(word)) found.push(word);
        penalties += matches.length * 5; // -5 points per spam word
      }
    });

    if (values.subject.toUpperCase() === values.subject && values.subject.length > 5) {
      penalties += 10; // ALL CAPS subject
    }

    const finalScore = Math.max(0, 100 - penalties);
    setScore(finalScore);
    setFoundWords(found);
    
    setIsScanningContent(true);
    try {
      const res = await fetch('/api/spamassassin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: values.subject, copy: values.copy })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSaResult({ score: data.score, rules: data.rules });
        }
      }
    } catch (err) {
      console.error(err);
    }
    
    setIsScanningContent(false);
    setScanned(true);
  };

  const highlightSpam = (text: string) => {
    if (!text) return null;
    let parts: any[] = [text];
    
    foundWords.forEach(word => {
      const newParts: any[] = [];
      const escaped = escapeRegExp(word);
      const regex = new RegExp(`(${escaped})`, 'gi');
      
      parts.forEach(part => {
        if (typeof part === 'string') {
          const split = part.split(regex);
          split.forEach((s, i) => {
            if (s.toLowerCase() === word.toLowerCase()) {
              newParts.push(<mark key={`${word}-${i}`} className="bg-hazard text-paper px-1 rounded">{s}</mark>);
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
    return parts;
  };

  return (
    <div className="pixel-border-lg bg-card p-6 md:p-8 max-w-2xl mx-auto text-left">
      <div className="font-pixel text-[10px] text-hazard mb-4 text-center">★ SPAM WORD CHECKER ★</div>
      
      {!scanned ? (
        <div className="space-y-4">
          <div>
            <label className="font-pixel text-[10px] text-muted-foreground block mb-2">SUBJECT LINE</label>
            <input
              type="text"
              value={values.subject}
              onChange={e => setValues(v => ({ ...v, subject: e.target.value }))}
              placeholder="🚀 Big news inside!!!"
              className="w-full bg-paper pixel-border-sm p-3 font-mono-pixel text-xl focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
            />
          </div>
          <div>
            <label className="font-pixel text-[10px] text-muted-foreground block mb-2">EMAIL COPY</label>
            <textarea
              rows={6}
              value={values.copy}
              onChange={e => setValues(v => ({ ...v, copy: e.target.value }))}
              placeholder="Hi {{first_name}}, we have a special promotion..."
              className="w-full bg-paper pixel-border-sm p-3 font-mono-pixel text-xl focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform"
            />
          </div>
          <div className="text-center pt-4">
            <PixelButton variant="accent" size="lg" onClick={handleScan} disabled={isScanningContent}>
              {isScanningContent ? "SCANNING VIA SPAMASSASSIN..." : "► SCAN CONTENT"}
            </PixelButton>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-ink pixel-border-sm text-center">
            <div className="font-pixel text-xs text-gold mb-2">SPAMASSASSIN SCORE</div>
            <div className={`font-pixel text-4xl ${saResult ? (parseFloat(saResult.score) < 5 ? 'text-crt-green' : 'text-hazard') : (score >= 80 ? 'text-crt-green' : 'text-hazard')}`}>
              {saResult ? `${saResult.score} / 5.0` : `${score}/100`}
            </div>
            <div className="font-mono-pixel text-lg text-paper mt-2">
              {saResult ? (
                parseFloat(saResult.score) < 5 ? "Looks clean! Minor risk." : "Warning: High risk of hitting the spam folder! Keep score < 5.0."
              ) : (
                score >= 80 ? "Looks clean! Minor risk." : score >= 60 ? "Warning: Some spam triggers found." : "High risk of hitting the spam folder!"
              )}
            </div>
          </div>

          {saResult && saResult.rules.length > 0 && (
            <div>
              <h3 className="font-pixel text-[10px] text-hazard mb-2">SPAMASSASSIN RULES MATCHED</h3>
              <div className="bg-ink pixel-border-sm p-4 font-mono-pixel text-sm text-paper flex flex-col gap-2">
                {saResult.rules.map((r, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-paper/10 pb-1">
                    <span className="text-muted-foreground">{r.description}</span>
                    <span className={`text-xs px-2 py-1 bg-paper/10 rounded ${parseFloat(r.score) > 0 ? 'text-hazard' : 'text-crt-green'}`}>
                      {parseFloat(r.score) > 0 ? '+' : ''}{r.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-pixel text-[10px] text-muted-foreground mb-2">SUBJECT ANALYSIS</h3>
            <div className="bg-paper pixel-border-sm p-4 font-mono-pixel text-xl whitespace-pre-wrap">
              {highlightSpam(values.subject) || <span className="text-muted-foreground italic">No subject provided.</span>}
            </div>
          </div>

          <div>
            <h3 className="font-pixel text-[10px] text-muted-foreground mb-2">COPY ANALYSIS</h3>
            <div className="bg-paper pixel-border-sm p-4 font-mono-pixel text-xl whitespace-pre-wrap">
              {highlightSpam(values.copy) || <span className="text-muted-foreground italic">No copy provided.</span>}
            </div>
          </div>

          {foundWords.length > 0 && (
            <div>
              <h3 className="font-pixel text-[10px] text-hazard mb-2">SPAM WORDS DETECTED</h3>
              <div className="flex flex-wrap gap-2">
                {foundWords.map(w => (
                  <span key={w} className="bg-hazard text-paper font-mono-pixel px-2 py-1 text-lg">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <PixelButton variant="ghost" onClick={() => setScanned(false)}>
              ← EDIT COPY
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
