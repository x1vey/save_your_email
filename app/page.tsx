"use client";

import { useState, useEffect } from "react";
import type { Answers, Question, ScanResult, ReportResponse, TriageResult } from "@/lib/types";
import { QUESTIONS, getSlot } from "@/lib/questions";
import Markdown from "@/components/Markdown";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Import new 8-bit components
import { PixelLayout } from "@/components/pixel/PixelLayout";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelCard, PixelBadge } from "@/components/pixel/PixelCard";
import { OgreEmailGame } from "@/components/pixel/OgreEmailGame";
import { EmailCheckPanel } from "@/components/pixel/EmailCheckPanel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

type Stage = "intro" | "scanning" | "scan" | "problem" | "triaging" | "questions" | "generating" | "report";
type Mode = "dmarc" | "spam";

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

function scoreColorClass(s: number) {
  if (s >= 80) return "text-crt-green border-crt-green";
  if (s >= 55) return "text-gold border-gold";
  return "text-hazard border-hazard";
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("dmarc");
  const [stage, setStage] = useState<Stage>("intro");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [user, setUser] = useState<any>(null);

  const [problemStatement, setProblemStatement] = useState("");
  const [triageSlots, setTriageSlots] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);

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

  useEffect(() => {
    if (user && !user.is_anonymous && leadEmail) {
      const supabase = createClient();
      if (supabase) {
        supabase
          .from("profiles")
          .update({ test_email: leadEmail })
          .eq("id", user.id)
          .then(
            () => console.log("Updated test_email with leadEmail", leadEmail),
            (err) => {
              console.error("Failed to update test_email", err);
              toast.error("Failed to save email address");
            }
          );
      }
    }
  }, [user, leadEmail]);

  async function runScan(inputEmail: string) {
    if (!user || user.is_anonymous) {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
      return;
    }
    const inputDomain = inputEmail.includes("@") ? inputEmail.split("@")[1] : inputEmail;
    setDomain(inputDomain);
    setError(null);
    if (!inputDomain.trim()) return;
    setStage("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: inputDomain, email: inputEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScan(data);
      if (data.leadEmail) setLeadEmail(data.leadEmail);
      if (data.leadEmailId) setLeadEmailId(data.leadEmailId);
      setStage("scan");
    } catch (e) {
      setError((e as Error).message);
      setStage("intro");
    }
  }

  function startProblemStep() {
    const isRealUser = user && !user.is_anonymous;
    if (isRealUser) {
      if (problemStatement.trim().length > 0) {
        runTriage();
      } else {
        setProblemStatement("");
        setStage("problem");
      }
    } else {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
    }
  }

  function handleDiagnoseClick() {
    if (!user || user.is_anonymous) {
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
    }
  }

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

  function nextQuestion() {
    if (qIndex + 1 >= triageSlots.length) {
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
    setLeadEmail("");
    setLeadEmailId("");
  }

  const isAnswered = current
    ? typeof answers[current.id] === "string" && (answers[current.id] as string).trim().length > 0
    : false;

  return (
    <PixelLayout>
      {stage === "intro" && (
        <>
          {/* HERO */}
          <section className="px-4 py-16 md:py-24 max-w-6xl mx-auto text-center">
            <PixelBadge tone="hazard" className="mb-6">★ NOW PLAYING ★</PixelBadge>
            <h1 className="font-pixel text-2xl sm:text-4xl md:text-5xl leading-tight mb-6">
              STOP LETTING YOUR<br />
              <span className="text-hazard text-pixel-shadow">EMAILS DIE</span>
              <span className="animate-blink"> _</span>
            </h1>
            <p className="font-mono-pixel text-xl md:text-2xl max-w-2xl mx-auto mb-10 text-muted-foreground">
              From unexplained spam complaints to high bounces, emails can be tricky. The good news is you'll NEVER have to guess again, just put in your problems and 
              get the solution. Let's save your email, without the complexity of emails!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <PixelButton
                variant={mode === "dmarc" ? "primary" : "ghost"}
                size="lg"
                onClick={() => setMode("dmarc")}
              >
                ► DMARC CHECK
              </PixelButton>
              <PixelButton
                variant={mode === "spam" ? "accent" : "ghost"}
                size="lg"
                onClick={() => setMode("spam")}
              >
                ► SPAM CHECK
              </PixelButton>
              {(!user || user.is_anonymous) && (
                <PixelButton size="lg" variant="secondary" onClick={handleDiagnoseClick}>
                  ★ DIAGNOSE MY EMAIL ★
                </PixelButton>
              )}
            </div>

            <div className="max-w-2xl mx-auto mb-8 text-left">
              <label className="font-pixel text-[10px] text-muted-foreground block mb-2 text-center uppercase">What email problem are you facing?</label>
              <textarea
                rows={3}
                placeholder="E.g. My open rates dropped from 40% to 2%..."
                value={problemStatement}
                onChange={(e) => {
                  if (!user || user.is_anonymous) {
                    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { allowGuest: false } }));
                    return;
                  }
                  setProblemStatement(e.target.value);
                }}
                className="w-full bg-paper pixel-border-sm p-4 font-mono-pixel text-xl focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform placeholder-ink/50"
              />
            </div>

            <EmailCheckPanel mode={mode} onScan={runScan} isScanning={false} isAuthenticated={user && !user.is_anonymous} />
            {error && <div className="text-hazard text-xl mt-4 font-mono-pixel">{error}</div>}
          </section>

          {/* GAME */}
          <section className="px-4 max-w-6xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-pixel text-base md:text-xl mb-2">YOUR EMAILS VS. THE SPAM OGRES</h2>
              <p className="font-mono-pixel text-lg text-muted-foreground">Tap or press SPACE to help the ogre deliver. This is what your campaigns face every day.</p>
            </div>
            <OgreEmailGame />
          </section>

          {/* FEATURES */}
          <section className="px-4 py-20 max-w-6xl mx-auto">
            <h2 className="font-pixel text-xl md:text-2xl text-center mb-12">★ WHAT THIS APP DOES ★</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <PixelCard tone="green">
                <PixelBadge tone="paper" className="mb-3">01</PixelBadge>
                <h3 className="font-pixel text-base mb-3">DIAGNOSE</h3>
                <ul className="font-mono-pixel text-lg space-y-2 list-none">
                  <li>► Scan your SPF, DKIM &amp; DMARC records — we flag anything missing or broken.</li>
                  <li>► Tell us your problem and current practices — we ask the right questions to understand your setup.</li>
                  <li>► Paste your email copy — we scan it for spam-trigger words that could tank deliverability.</li>
                </ul>
              </PixelCard>
              <PixelCard tone="gold">
                <PixelBadge tone="paper" className="mb-3">02</PixelBadge>
                <h3 className="font-pixel text-base mb-3">FIX</h3>
                <ul className="font-mono-pixel text-lg space-y-2 list-none">
                  <li>► See which records are connected and get clear warnings for anything missing — with SpamAssassin-grade checks for extra peace of mind.</li>
                  <li>► Get a personalised DIY fix plan built around your exact problem — clear direction, no jargon. For deeper issues, book a free audit.</li>
                  <li>► Highlighted spam words, explained. We can even rewrite the flagged copy for you.</li>
                </ul>
              </PixelCard>
              <PixelCard tone="sky">
                <PixelBadge tone="paper" className="mb-3">03</PixelBadge>
                <h3 className="font-pixel text-base mb-3">AUDIT</h3>
                <p className="font-mono-pixel text-lg mb-3">This app gives you solid DIY solutions and the basics of campaign design. When you need in-depth consultation — domain reputation, IP reputation, agency IP, warm-up strategy — book a 1-on-1 session.</p>
                <p className="font-mono-pixel text-lg text-sky font-bold">Free for now. Book a call below.</p>
              </PixelCard>
            </div>
          </section>

          {/* WHO IT'S FOR */}
          <section className="bg-ink text-paper py-20 px-4 border-y-4 border-ink">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-pixel text-xl md:text-2xl text-center mb-12 text-gold">★ WHO IT'S FOR ★</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {[
                  { who: "FOUNDERS", desc: "Want DIY solutions without hiring a consultant? Put your problem in here and get a clear fix plan." },
                  { who: "MARKETERS STARTING OUT", desc: "Still learning the ropes? We break down deliverability in plain English so you actually understand what to change." },
                  { who: "CONFUSED BY STATS", desc: "Seeing unexplained drops in opens or clicks? We dig into the real cause — not just the symptoms." },
                  { who: "GHL BUSINESS OWNERS", desc: "Running a business on GoHighLevel? We help you get your sending domain, warm-up, and campaigns dialled in." },
                  { who: "GHL AGENCY OWNERS", desc: "Managing client subaccounts? Get clarity on sending domains, agency IPs, and reputation — fast." },
                  { who: "LOST IN REPUTATION LAND", desc: "Domain reputation. IP reputation. Agency IP. It's confusing. Take a breath — put all your problems in here and we'll guide you through it." },
                ].map((p) => (
                  <div key={p.who} className="bg-paper text-ink pixel-border p-6">
                    <div className="font-pixel text-sm text-hazard mb-3">{p.who}</div>
                    <p className="font-mono-pixel text-lg">{p.desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="font-mono-pixel text-lg text-gold max-w-2xl mx-auto">
                  This tool is primarily built for GHL users — but we are constantly working to help as many people as we can.
                </p>
                <p className="font-pixel text-sm text-paper/70 mt-3">Let&apos;s make emails great again.</p>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="px-4 py-20 max-w-6xl mx-auto">
            <h2 className="font-pixel text-xl md:text-2xl text-center mb-12">★ HOW IT WORKS ★</h2>
            <ol className="grid md:grid-cols-4 gap-6">
              {[
                "Enter your domain",
                "We run 40+ deliverability checks",
                "You get a pixel-clear report",
                "Apply fixes & ship",
              ].map((step, i) => (
                <li key={step} className="pixel-border p-6 bg-card relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-hazard text-paper font-pixel text-sm flex items-center justify-center border-4 border-ink">
                    {i + 1}
                  </div>
                  <p className="font-mono-pixel text-lg mt-3">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* PRICING TEASER */}
          <section className="px-4 py-20 max-w-3xl mx-auto text-center">
            <PixelCard tone="gold" className="!p-10">
              <PixelBadge tone="hazard" className="mb-4">★ FREE FOREVER ★</PixelBadge>
              <h2 className="font-pixel text-2xl md:text-3xl mb-4">LIFETIME FREE</h2>
              <p className="font-mono-pixel text-xl mb-8">No credit card. No trial. No "starting at". Just free, because spam shouldn't win.</p>
              <Link href="/pricing"><PixelButton variant="primary" size="lg">See Pricing</PixelButton></Link>
            </PixelCard>
          </section>

          {/* FAQ */}
          <section className="px-4 py-20 max-w-3xl mx-auto">
            <h2 className="font-pixel text-xl md:text-2xl text-center mb-12">★ FAQ ★</h2>
            <div className="pixel-border bg-card p-6">
              <Accordion type="single" collapsible>
                {[
                  { q: "Is it really free forever?", a: "Yes. No tiers. No upsells. The founder pays for the servers because deliverability tooling shouldn't cost $300/mo." },
                  { q: "Do I need to install anything?", a: "Nope. We work with DNS records and your domain. No code, no JavaScript snippet." },
                  { q: "Will you send emails for me?", a: "No. We make sure your emails — sent through your existing ESP — actually arrive." },
                  { q: "How fast is the audit?", a: "About 90 seconds. We run 40+ checks in parallel." },
                  { q: "Do you support all ESPs?", a: "Yes. Mailchimp, Resend, Postmark, Sendgrid, AWS SES, custom SMTP — anything." },
                ].map((f, i) => (
                  <AccordionItem key={f.q} value={`item-${i}`} className="border-ink border-b-2 last:border-0">
                    <AccordionTrigger className="font-pixel text-xs uppercase hover:no-underline py-4">{f.q}</AccordionTrigger>
                    <AccordionContent className="font-mono-pixel text-lg">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="px-4 py-20 max-w-4xl mx-auto text-center">
            <h2 className="font-pixel text-2xl md:text-3xl mb-6">READY PLAYER ONE?</h2>
            <p className="font-mono-pixel text-xl mb-8 text-muted-foreground">Book an expert audit. Get your fixes. Land in the inbox.</p>
            <Link href="https://calendly.com/psycicx1ve/30min" target="_blank"><PixelButton variant="accent" size="lg">★ BOOK A CALL ★</PixelButton></Link>
          </section>
        </>
      )}

      {/* SCANNING & DIAGNOSIS LOGIC UI */}
      {stage === "scanning" && (
        <section className="px-4 py-16 max-w-2xl mx-auto">
          <PixelCard tone="sky" className="text-center">
            <h2 className="font-pixel text-xl mb-4 animate-blink text-sky">SCANNING {domain}...</h2>
            <p className="font-mono-pixel text-lg mb-8">Resolving MX, SPF, DKIM and DMARC records.</p>
            <div className="pixel-border-sm bg-ink p-4 text-left">
               <div className="font-pixel text-xs text-gold mb-2">★ FACT ★</div>
               <div className="font-mono-pixel text-lg text-paper">{EMAIL_FACTS[factIndex]}</div>
            </div>
          </PixelCard>
        </section>
      )}

      {stage === "scan" && scan && (
        <section className="px-4 py-16 max-w-4xl mx-auto space-y-8">
          <h1 className="font-pixel text-2xl uppercase">
            RESULTS: {scan.domain}
          </h1>
          
          <PixelCard tone={scan.techScore >= 80 ? "green" : scan.techScore >= 55 ? "gold" : "hazard"}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-pixel text-2xl ${scoreColorClass(scan.techScore)}`}>
                {scan.techScore}
              </div>
              <div className="flex-1 font-mono-pixel text-xl leading-relaxed">
                Technical authentication score based on DNS. Describe your problem next so we can ask the right questions and write your fix plan.
              </div>
            </div>
          </PixelCard>

          <div className="space-y-6">
            {scan.findings.map((f) => (
              <PixelCard key={f.id} tone={f.severity === 'fail' ? 'hazard' : f.severity === 'warn' ? 'gold' : 'green'}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-pixel text-base">{f.title}</h3>
                  <PixelBadge tone={f.severity === 'fail' ? 'hazard' : f.severity === 'warn' ? 'gold' : 'green'} className="text-[10px]">
                    {f.severity.toUpperCase()}
                  </PixelBadge>
                </div>
                <p className="font-mono-pixel text-lg leading-relaxed">{f.detail}</p>
                {f.fix && (
                  <p className="font-mono-pixel text-lg mt-4 pt-4 border-t-2 border-ink border-dashed">
                    <strong className="text-hazard">FIX: </strong> {f.fix}
                  </p>
                )}
              </PixelCard>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <PixelButton variant="ghost" onClick={reset}>← BACK</PixelButton>
            <PixelButton variant="primary" onClick={startProblemStep}>CONTINUE ►</PixelButton>
          </div>
        </section>
      )}

      {stage === "problem" && (
        <section className="px-4 py-16 max-w-2xl mx-auto space-y-8">
          <h1 className="font-pixel text-2xl text-primary">WHAT'S THE PROBLEM?</h1>
          <p className="font-mono-pixel text-xl leading-relaxed text-muted-foreground">
            Describe the deliverability issue you're experiencing — or leave blank if you just want a general health check.
          </p>
          
          <PixelCard>
            <textarea
              rows={5}
              placeholder="E.g. My open rates dropped from 40% to 2%..."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="w-full bg-paper pixel-border-sm p-4 font-mono-pixel text-xl focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform placeholder-ink/50"
            />
            <div className="flex justify-between mt-6">
              <PixelButton variant="ghost" onClick={() => setStage("scan")}>← BACK</PixelButton>
              <PixelButton variant="accent" onClick={runTriage}>CONTINUE ►</PixelButton>
            </div>
          </PixelCard>
          {error && <div className="text-hazard font-mono-pixel text-xl mt-4">{error}</div>}
        </section>
      )}

      {(stage === "triaging" || stage === "generating") && (
        <section className="px-4 py-16 max-w-2xl mx-auto">
          <PixelCard tone="sky" className="text-center">
            <h2 className="font-pixel text-xl mb-4 animate-blink text-sky">
              {stage === "triaging" ? "ANALYZING..." : "WRITING FIX PLAN..."}
            </h2>
            <div className="pixel-border-sm bg-ink p-4 text-left mt-8">
               <div className="font-pixel text-xs text-gold mb-2">★ FACT ★</div>
               <div className="font-mono-pixel text-lg text-paper">{EMAIL_FACTS[factIndex]}</div>
            </div>
          </PixelCard>
        </section>
      )}

      {stage === "questions" && current && (
        <section className="px-4 py-16 max-w-2xl mx-auto space-y-8">
          <div className="h-4 bg-paper pixel-border-sm w-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${((qIndex + 1) / triageSlots.length) * 100}%` }} />
          </div>

          <div>
            <h2 className="font-pixel text-xl mb-4 leading-relaxed">{current.text}</h2>
            {current.help && <p className="font-mono-pixel text-lg text-muted-foreground">{current.help}</p>}
          </div>

          <PixelCard>
            <textarea
              rows={4}
              placeholder="TYPE YOUR ANSWER..."
              value={typedAnswer}
              onChange={(e) => handleTextareaChange(e.target.value)}
              className="w-full bg-paper pixel-border-sm p-4 font-mono-pixel text-xl focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] transition-transform placeholder-ink/50"
            />
            
            {current.options && current.options.length > 0 && (
              <div className="mt-6">
                <div className="font-pixel text-[10px] text-muted-foreground mb-4">SUGGESTIONS:</div>
                <div className="flex flex-wrap gap-2">
                  {current.options.map((opt) => (
                    <PixelButton
                      key={opt.value}
                      variant={typedAnswer === opt.label ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handleTextareaChange(opt.label)}
                    >
                      {opt.label}
                    </PixelButton>
                  ))}
                </div>
              </div>
            )}
          </PixelCard>

          <div className="flex justify-between items-center mt-8">
            <PixelButton variant="ghost" onClick={prevQuestion}>← BACK</PixelButton>
            <span className="font-pixel text-[10px] text-muted-foreground">Q {qIndex + 1} OF {triageSlots.length}</span>
            <PixelButton variant="accent" onClick={nextQuestion} disabled={!isAnswered}>
              {qIndex + 1 >= triageSlots.length ? "FINISH" : "NEXT ►"}
            </PixelButton>
          </div>
        </section>
      )}

      {stage === "report" && report && report.status === "inconclusive" && report.followUpQuestions && (
        <section className="px-4 py-16 max-w-2xl mx-auto space-y-8">
          <h1 className="font-pixel text-2xl text-hazard">NEED MORE DATA</h1>
          <p className="font-mono-pixel text-lg text-muted-foreground">
            We need a few more details to generate your custom action plan.
          </p>
          <PixelCard>
            <div className="space-y-6">
              {report.followUpQuestions.map((q) => (
                <div key={q.id}>
                  <div className="font-pixel text-sm mb-2">{q.text}</div>
                  {q.help && <div className="font-mono-pixel text-sm text-muted-foreground mb-4">{q.help}</div>}
                  <textarea
                    rows={3}
                    placeholder="TYPE ANSWER..."
                    value={followUpAnswers[q.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFollowUpAnswers((prev) => ({ ...prev, [q.id]: val }));
                    }}
                    className="w-full bg-paper pixel-border-sm p-4 font-mono-pixel text-lg focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-8">
              <PixelButton variant="ghost" onClick={() => { setReport(null); setStage("questions"); }}>← BACK</PixelButton>
              <PixelButton
                variant="accent"
                disabled={!report.followUpQuestions.every((q) => (followUpAnswers[q.id] || "").trim().length > 0)}
                onClick={() => {
                  const combinedAnswers = { ...answers, ...followUpAnswers };
                  setAnswers(combinedAnswers);
                  generateReport(scan!, combinedAnswers);
                }}
              >
                SUBMIT ►
              </PixelButton>
            </div>
          </PixelCard>
        </section>
      )}

      {stage === "report" && report && report.status !== "inconclusive" && (
        <section className="px-4 py-16 max-w-3xl mx-auto space-y-8">
          <h1 className="font-pixel text-2xl uppercase">REMEDIATION PLAN</h1>
          
          <PixelCard tone={report.finalScore >= 80 ? "green" : report.finalScore >= 55 ? "gold" : "hazard"}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-pixel text-2xl ${scoreColorClass(report.finalScore)}`}>
                {report.finalScore}
              </div>
              <div className="flex-1 font-mono-pixel text-xl leading-relaxed">
                Overall deliverability score (technical + behavioral).
              </div>
            </div>
          </PixelCard>

          <PixelCard className="MarkdownContent font-mono-pixel text-lg leading-loose">
            <style dangerouslySetInnerHTML={{__html:`
              .MarkdownContent h1, .MarkdownContent h2, .MarkdownContent h3 { font-family: 'Press Start 2P', system-ui, monospace; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.5; color: var(--color-ink); font-size: 1.2rem;}
              .MarkdownContent p, .MarkdownContent li { font-family: 'VT323', ui-monospace, monospace; font-size: 1.25rem; line-height: 2; margin-bottom: 1rem; color: var(--color-ink); }
              .MarkdownContent code { background: var(--color-ink); padding: 4px; border: 2px solid var(--color-crt-green); font-family: monospace; font-size: 1.125rem; color: var(--color-crt-green); }
              .MarkdownContent pre { background: var(--color-ink); color: var(--color-crt-green); padding: 1rem; border: 4px solid var(--color-ink); overflow-x: auto; margin-bottom: 1rem; }
              .MarkdownContent pre code { background: none; border: none; color: var(--color-crt-green); }
            `}} />
            <Markdown source={report.markdown || ""} />
          </PixelCard>

          <div className="flex justify-between mt-8">
            <PixelButton variant="ghost" onClick={reset}>START OVER</PixelButton>
            <PixelButton variant="primary" onClick={() => window.print()}>PRINT PDF</PixelButton>
          </div>
        </section>
      )}

    </PixelLayout>
  );
}
