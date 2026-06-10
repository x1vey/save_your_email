// Triage logic (Call 1 of the two-call LLM architecture).
//
// A single LLM call sees the DNS scan and the user's free-text problem statement,
// then returns an ordered array of question slot IDs from the canonical registry
// in lib/questions.ts. The app maps those IDs to natural language questions and
// renders them. No per-question API calls.
//
// The triage call uses TRIAGE_SYSTEM_PROMPT from lib/prompt.ts which encodes the
// full reasoning constitution — credit model, elimination order, triage triggers,
// benchmarks, and the contamination guard.

import type { ScanResult, TriageResult } from "./types";
import { QUESTIONS, visibleQuestions, getSlotRegistry } from "./questions";

export const MAX_QUESTIONS = 8;

// Summarize what the DNS scan already established so the triage LLM never asks
// about something we already know. These facts are injected into the user message
// so the model can skip redundant slots.
export function knownFactsFromScan(scan: ScanResult): string[] {
  const facts: string[] = [];

  if (scan.esp) {
    facts.push(`Email provider detected: ${scan.esp.name} (via ${scan.esp.source.toUpperCase()}).`);
  }

  for (const f of scan.findings) {
    // Include severity and any evidence so the triage has full context
    const evidence = f.evidence ? ` Evidence: ${f.evidence}` : "";
    facts.push(`${f.title}: ${f.severity}.${evidence}`);
  }

  // Explicitly flag if auth is clean — this changes which questions matter most
  const authFindings = scan.findings.filter((f) => f.category === "auth");
  const authFails = authFindings.filter((f) => f.severity === "fail");
  if (authFindings.length > 0 && authFails.length === 0) {
    facts.push("Authentication (SPF/DKIM/DMARC) is passing — auth is not the problem.");
  }

  return facts;
}

// Detect likely context signals from the problem statement text.
// These help the triage reason about which path applies before the LLM call,
// and are included in the user message as hints.
export function detectProblemSignals(problemStatement: string): string[] {
  const signals: string[] = [];
  const text = problemStatement.toLowerCase();

  if (text.match(/sudden|overnight|dropped|crash|collapsed|tanked/)) {
    signals.push("SUDDEN_DROP: Problem statement suggests an abrupt change, not a gradual decline.");
  }
  if (text.match(/gradual|slowly|over (weeks|months)|declining|dropping/)) {
    signals.push("GRADUAL_DECLINE: Problem statement suggests slow erosion over time.");
  }
  if (text.match(/new domain|just (set up|started|launched)|brand new/)) {
    signals.push("NEW_DOMAIN: Problem statement suggests a new domain with no established reputation.");
  }
  if (text.match(/haven't sent|long gap|months since|restarting|starting again/)) {
    signals.push("RESTART_AFTER_GAP: Problem statement suggests sending is resuming after a long pause.");
  }
  if (text.match(/unsubscri/)) {
    signals.push("UNSUBSCRIBE_SIGNAL: Problem statement mentions unsubscribes — likely a relevance or list issue, not inbox placement.");
  }
  if (text.match(/spam|junk|folder|not (arriving|landing|reaching)/)) {
    signals.push("SPAM_FOLDER: Problem statement suggests mail is landing in spam or not arriving.");
  }
  if (text.match(/cold (email|outreach)|prospect|lead list|b2b outreach/)) {
    signals.push("COLD_EMAIL_CONTEXT: Problem statement suggests cold outreach — this may be outside core scope.");
  }
  if (text.match(/bounce|bouncing/)) {
    signals.push("BOUNCE_SIGNAL: Problem statement mentions bounces — list quality or volume may be the cause.");
  }
  if (text.match(/open rate|opens (dropped|fell|low)/)) {
    signals.push("OPEN_RATE_SIGNAL: Problem statement directly references open rate changes.");
  }
  if (text.match(/scale|send more|increase volume|grow/)) {
    signals.push("SCALING_INTENT: Problem statement suggests the user wants to increase sending volume safely.");
  }

  return signals;
}

// Build the user message for Call 1 (Triage).
// This is what gets sent alongside TRIAGE_SYSTEM_PROMPT.
// The slot registry gives the model all available question IDs with their
// intent and tier so it can make an informed selection.
export function buildTriageUserMessage(
  scan: ScanResult,
  problemStatement: string
): string {
  const knownFacts = knownFactsFromScan(scan);
  const problemSignals = detectProblemSignals(problemStatement);
  const normalizedStatement = problemStatement.trim() ||
    "(No problem stated — assume user wants to improve open rate while safely scaling volume.)";

  return JSON.stringify(
    {
      KNOWN_FROM_SCAN: knownFacts,
      detectedProvider: scan.esp?.name ?? "unknown",
      techScore: scan.techScore,
      problemStatement: normalizedStatement,
      detectedSignals: problemSignals,
      SLOT_REGISTRY: getSlotRegistry(),
    },
    null,
    2
  );
}

// Validate and parse the triage model's JSON output.
// Tolerates code fences or stray prose around the JSON.
// Returns null if the output is unusable — caller falls back to fallbackTriage.
export function parseTriageResult(raw: string): TriageResult | null {
  let obj: Record<string, unknown>;

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    obj = JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }

  if (!Array.isArray(obj.slotIds)) return null;

  // Filter to only valid slot IDs that exist in the registry.
  // Prevents the model from hallucinating slot IDs that don't exist.
  const validIds = new Set(QUESTIONS.map((q) => q.id));
  const slotIds = (obj.slotIds as string[]).filter(
    (id) => typeof id === "string" && validIds.has(id)
  );

  if (slotIds.length === 0) return null;

  return {
    slotIds: slotIds.slice(0, MAX_QUESTIONS),
    rationale: typeof obj.rationale === "string" ? obj.rationale : undefined,
  };
}

// Deterministic fallback when no LLM key is configured or the model output is
// unusable. Returns all visible slots in default tier order, capped at MAX_QUESTIONS.
// This ensures the tool is always functional even without an API key.
export function fallbackTriage(scan: ScanResult): TriageResult {
  const visible = visibleQuestions({}, scan);

  // Sort by tier ascending so foundational questions come first
  const sorted = [...visible].sort((a, b) => (a.tier ?? 3) - (b.tier ?? 3));

  return {
    slotIds: sorted.slice(0, MAX_QUESTIONS).map((q) => q.id),
    rationale: "Deterministic fallback — visible slots sorted by tier priority.",
  };
}