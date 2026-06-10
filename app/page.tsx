"use client";

import { useState, useEffect } from "react";
import type { Answers, Question, ScanResult, ReportResponse, TriageResult } from "@/lib/types";
import { QUESTIONS, getSlot } from "@/lib/questions";
import Markdown from "@/components/Markdown";
import LintPanel from "@/components/LintPanel";
import { createClient } from "@/lib/supabase/client";

// Import new 8-bit components
import { MiniNavbar } from "@/components/ui/sign-in-flow-1";
import { GameAnimation } from "@/components/game-animation";
import Team2 from "@/components/ui/8bit-team2";
import { Button } from "@/components/ui/8bit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/8bit-card";
import { Badge } from "@/components/ui/8bit-badge";

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

function scoreColorClass(s: number) {
  if (s >= 80) return "text-emerald-400 border-emerald-400";
  if (s >= 55) return "text-amber-400 border-amber-400";
  return "text-red-400 border-red-400";
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

  const [problemStatement, setProblemStatement] = useState("");
  const [triageSlots, setTriageSlots] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [leadEmail, setLeadEmail] = useState("");
  const [leadEmailId, setLeadEmailId] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOnboarding(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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
            (err) => console.error("Failed to update test_email", err)
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
      setProblemStatement("");
      setStage("problem");
    } else {
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
    <div className="min-h-screen bg-background retro pb-24 overflow-x-hidden">
      <MiniNavbar />

      <main className="max-w-4xl mx-auto pt-32 px-4 flex flex-col items-center">
        
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-white relative">
              <button 
                className="absolute top-4 right-4 text-2xl hover:text-red-500"
                onClick={() => setShowOnboarding(false)}
              >
                ×
              </button>
              <CardHeader>
                <CardTitle className="text-xl">What are you looking for today?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-between py-6 text-[10px]"
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
                  <div className="text-left">
                    <div className="font-bold">Email copy refinement</div>
                    <div className="text-gray-500 text-[8px] mt-1">Check if your copy triggers spam filters.</div>
                  </div>
                  <span>→</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-between py-6 text-[10px]"
                  onClick={() => {
                    setShowOnboarding(false);
                    setMode("diagnose");
                  }}
                >
                  <div className="text-left">
                    <div className="font-bold">Diagnose my email</div>
                    <div className="text-gray-500 text-[8px] mt-1">Check SPF, DKIM, and DMARC alignment.</div>
                  </div>
                  <span>→</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Game Animation Banner Section */}
        {mode === "diagnose" && stage === "intro" && (
          <div className="w-full mb-16">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-4xl font-bold uppercase mb-4 leading-relaxed">
                Why are your emails<br/>landing in <span className="text-red-500">SPAM</span>?
              </h1>
              <p className="text-[10px] text-gray-600 max-w-xl mx-auto leading-loose">
                Enter your sending email address. We'll run a live scan of your authentication records, then hand you a prioritized fix list to beat the spam filters.
              </p>
            </div>
            
            <GameAnimation />

            <div className="mt-12 w-full max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="USER@DOMAIN.COM"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runScan()}
                  className="flex-1 bg-white border-4 border-black p-4 text-[10px] uppercase shadow-[4px_4px_0_0_#000] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_0_#000] transition-all"
                />
                <Button onClick={runScan} disabled={!domain.trim()} className="py-4 px-8 text-[10px]">
                  SCAN DOMAIN
                </Button>
              </div>
              <p className="text-[8px] text-gray-400 mt-4 text-center">
                We only read public DNS records. Nothing is sent on your behalf.
              </p>
              {error && <div className="text-red-500 text-[10px] mt-4 text-center border-2 border-red-500 p-2">{error}</div>}
            </div>
          </div>
        )}

        {mode === "diagnose" && stage === "scanning" && (
          <Card className="w-full max-w-2xl mx-auto mt-16 p-8 text-center bg-white">
            <h2 className="text-xl mb-4 animate-pulse">SCANNING {domain.includes("@") ? domain.split("@")[1] : domain}...</h2>
            <p className="text-[10px] text-gray-500 mb-8">Resolving MX, SPF, DKIM and DMARC records.</p>
            
            <div className="bg-gray-100 border-4 border-black p-6 relative shadow-inner">
               <div className="text-[10px] text-primary mb-2 font-bold">DELIVERABILITY FACT</div>
               <div className="text-[10px] leading-loose">{EMAIL_FACTS[factIndex]}</div>
            </div>
          </Card>
        )}

        {mode === "diagnose" && stage === "scan" && scan && (
          <div className="w-full max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold uppercase">
              SCAN RESULTS: {scan.domain}
            </h1>
            
            <div className="flex items-center gap-6 bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_#000]">
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-bold ${scoreColorClass(scan.techScore)}`}>
                {scan.techScore}
              </div>
              <div className="flex-1 text-[10px] leading-loose text-gray-600">
                Technical (authentication) score from DNS alone. Describe your problem next so we can ask the right questions and write your fix plan.
              </div>
            </div>

            <div className="space-y-4">
              {scan.findings.map((f) => (
                <Card key={f.id} className="relative overflow-visible">
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge variant={f.severity === 'fail' ? 'destructive' : f.severity === 'warn' ? 'secondary' : 'default'} className="text-[10px] py-1">
                      {f.severity}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] leading-loose text-gray-600">{f.detail}</p>
                    {f.fix && (
                      <p className="text-[10px] leading-loose mt-4 border-t-2 border-black pt-2">
                        <strong className="text-black">FIX: </strong> {f.fix}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={reset}>← BACK</Button>
              <Button onClick={startProblemStep}>CONTINUE →</Button>
            </div>
          </div>
        )}

        {mode === "diagnose" && stage === "problem" && (
          <div className="w-full max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">WHAT'S THE PROBLEM?</h1>
            <p className="text-[10px] text-gray-600 leading-loose">
              Describe the deliverability issue you're experiencing — or leave blank if you just want a general health check.
            </p>
            
            <Card className="p-6 bg-white">
              <textarea
                rows={5}
                placeholder="E.g. My open rates dropped from 40% to 2%..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                className="w-full bg-gray-50 border-4 border-black p-4 text-[10px] leading-loose focus:outline-none focus:bg-white resize-y"
              />
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStage("scan")}>← BACK</Button>
                <Button onClick={runTriage}>CONTINUE →</Button>
              </div>
            </Card>
            {error && <div className="text-red-500 text-[10px] mt-4">{error}</div>}
          </div>
        )}

        {mode === "diagnose" && (stage === "triaging" || stage === "generating") && (
          <Card className="w-full max-w-2xl mx-auto mt-16 p-8 text-center bg-white">
            <h2 className="text-xl mb-4 animate-pulse">
              {stage === "triaging" ? "ANALYZING..." : "WRITING FIX PLAN..."}
            </h2>
            <div className="bg-gray-100 border-4 border-black p-6 relative shadow-inner mt-8">
               <div className="text-[10px] text-primary mb-2 font-bold">DELIVERABILITY FACT</div>
               <div className="text-[10px] leading-loose">{EMAIL_FACTS[factIndex]}</div>
            </div>
          </Card>
        )}

        {mode === "diagnose" && stage === "questions" && current && (
          <div className="w-full max-w-2xl mx-auto space-y-8">
            <div className="h-4 bg-gray-200 border-4 border-black w-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${((qIndex + 1) / triageSlots.length) * 100}%` }} />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2 leading-relaxed">{current.text}</h2>
              {current.help && <p className="text-[10px] text-gray-500 leading-loose">{current.help}</p>}
            </div>

            <Card className="p-6 bg-white">
              <textarea
                rows={4}
                placeholder="TYPE YOUR ANSWER..."
                value={typedAnswer}
                onChange={(e) => handleTextareaChange(e.target.value)}
                className="w-full bg-gray-50 border-4 border-black p-4 text-[10px] leading-loose focus:outline-none focus:bg-white"
              />
              
              {current.options && current.options.length > 0 && (
                <div className="mt-6">
                  <div className="text-[8px] text-gray-500 font-bold mb-4">SUGGESTIONS:</div>
                  <div className="flex flex-wrap gap-2">
                    {current.options.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={typedAnswer === opt.label ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTextareaChange(opt.label)}
                        className="text-[8px]"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-between items-center mt-8">
              <Button variant="outline" onClick={prevQuestion}>← BACK</Button>
              <span className="text-[8px] text-gray-400">Q {qIndex + 1} OF {triageSlots.length}</span>
              <Button onClick={nextQuestion} disabled={!isAnswered}>
                {qIndex + 1 >= triageSlots.length ? "FINISH" : "NEXT →"}
              </Button>
            </div>
          </div>
        )}

        {mode === "diagnose" && stage === "report" && report && report.status === "inconclusive" && report.followUpQuestions && (
          <div className="w-full max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">NEED MORE DATA</h1>
            <p className="text-[10px] text-gray-600 leading-loose">
              We need a few more details to generate your custom action plan.
            </p>
            <Card className="p-6 bg-white space-y-6">
              {report.followUpQuestions.map((q) => (
                <div key={q.id}>
                  <div className="font-bold text-sm mb-2">{q.text}</div>
                  {q.help && <div className="text-[8px] text-gray-500 mb-4">{q.help}</div>}
                  <textarea
                    rows={3}
                    placeholder="TYPE ANSWER..."
                    value={followUpAnswers[q.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFollowUpAnswers((prev) => ({ ...prev, [q.id]: val }));
                    }}
                    className="w-full bg-gray-50 border-4 border-black p-4 text-[10px] leading-loose focus:outline-none focus:bg-white"
                  />
                </div>
              ))}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => { setReport(null); setStage("questions"); }}>← BACK</Button>
                <Button
                  disabled={!report.followUpQuestions.every((q) => (followUpAnswers[q.id] || "").trim().length > 0)}
                  onClick={() => {
                    const combinedAnswers = { ...answers, ...followUpAnswers };
                    setAnswers(combinedAnswers);
                    generateReport(scan!, combinedAnswers);
                  }}
                >
                  SUBMIT
                </Button>
              </div>
            </Card>
          </div>
        )}

        {mode === "diagnose" && stage === "report" && report && report.status !== "inconclusive" && (
          <div className="w-full max-w-3xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold">REMEDIATION PLAN</h1>
            
            <div className="flex items-center gap-6 bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_#000]">
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-bold ${scoreColorClass(report.finalScore)}`}>
                {report.finalScore}
              </div>
              <div className="flex-1 text-[10px] leading-loose text-gray-600">
                Overall deliverability score (technical + behavioral).
              </div>
            </div>

            <Card className="p-8 bg-white MarkdownContent text-[10px] leading-loose">
               <style dangerouslySetInnerHTML={{__html:`
                 .MarkdownContent h1, .MarkdownContent h2, .MarkdownContent h3 { font-family: 'Press Start 2P', monospace; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.5; }
                 .MarkdownContent p, .MarkdownContent li { font-family: 'Press Start 2P', monospace; font-size: 10px; line-height: 2; margin-bottom: 1rem; }
                 .MarkdownContent code { background: #eee; padding: 4px; border: 2px solid #000; font-family: monospace; font-size: 12px; }
                 .MarkdownContent pre { background: #111; color: #fff; padding: 1rem; border: 4px solid #000; overflow-x: auto; margin-bottom: 1rem; }
                 .MarkdownContent pre code { background: none; border: none; color: #0f0; }
               `}} />
              <Markdown source={report.markdown || ""} />
            </Card>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={reset}>START OVER</Button>
              <Button onClick={() => window.print()}>PRINT PDF</Button>
            </div>
          </div>
        )}

        {/* FAQ/Changelog Section at Bottom */}
        {mode === "diagnose" && stage === "intro" && (
          <div className="mt-24 w-full">
            <Team2 />
          </div>
        )}

      </main>
    </div>
  );
}
