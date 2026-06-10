// Shared types for the deliverability diagnostic.

export type Severity = "ok" | "warn" | "fail" | "info";

export interface Finding {
  id: string;
  // Which layer of the email stack this belongs to.
  category: "auth" | "routing" | "reputation" | "compliance" | "content" | "behavior";
  title: string;
  severity: Severity;
  // Plain-English explanation of what was found.
  detail: string;
  // The concrete fix, if this is a problem. Empty for "ok"/"info".
  fix?: string;
  // Raw evidence (the actual record found), shown in a code block.
  evidence?: string;
  // Weight toward the deliverability score (0-100). Only fails/warns deduct.
  weight: number;
}

export interface ScanResult {
  domain: string;
  scannedAt: string;
  esp: EspGuess | null;
  findings: Finding[];
  // 0-100 health score derived from findings.
  score: number;
  // Domain-only score (before behavioral questions are factored in).
  techScore: number;
}

export interface EspGuess {
  // e.g. "Google Workspace", "Microsoft 365", "Mailchimp", "SendGrid".
  name: string;
  // How we detected it.
  source: "mx" | "spf";
  // DKIM selectors worth probing for this provider.
  likelySelectors: string[];
}

// One canonical question "slot" in the adaptive interview (things DNS can't
// reveal). The decision tree defines these slots; the AI interviewer chooses which
// to ask next, skips irrelevant ones, and re-phrases `text`/`help` for context —
// but `id`, `type`, and option `value`s stay canonical so scoring stays intact.
export interface Question {
  id: string;
  text: string;
  help?: string;
  type: "single" | "multi" | "number";
  options?: { value: string; label: string }[];
  // Only show this question if the predicate passes given prior answers + scan.
  showIf?: (ctx: { answers: Answers; scan: ScanResult | null }) => boolean;
  // What decision this slot informs — shown to the AI interviewer so it can pick
  // the highest-value next question. Not shown to the end user.
  intent?: string;
  // Diagnostic tier (1 = auth … 5 = reputation/capacity). Lower = ask earlier.
  tier?: number;
}

// A single turn from the AI interviewer (legacy, kept for compat).
export interface InterviewTurn {
  done: boolean;
  question?: Question;
  rationale?: string;
}

// --- Two-call LLM architecture types ---

export interface TriageRequest {
  scan: ScanResult;
  problemStatement: string;
}

export interface TriageResult {
  // Ordered array of question slot IDs from the canonical registry.
  slotIds: string[];
  // Why the triage chose these slots. For logging/debugging.
  rationale?: string;
}

export type Answers = Record<string, string | string[] | number>;

export interface ReportRequest {
  scan: ScanResult;
  answers: Answers;
  // Free-text problem description from Layer 2 (may be empty).
  problemStatement?: string;
  triageSlots?: string[];
}

export interface ReportResponse {
  // Markdown body of the prioritized fix plan.
  markdown: string;
  // Whether this came from the LLM or the deterministic fallback.
  source: "ai" | "fallback";
  finalScore: number;
}
