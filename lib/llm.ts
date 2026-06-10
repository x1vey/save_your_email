import OpenAI from "openai";
import { TRIAGE_SYSTEM_PROMPT, DIAGNOSIS_SYSTEM_PROMPT } from "./prompt";

// Both OpenAI and Groq speak the same chat-completions API, so a single client
// with a swappable baseURL/model covers both. Provider is chosen by env:
//   LLM_PROVIDER=groq | openai   (defaults to whichever key is present, Groq first)
//   GROQ_API_KEY   / GROQ_MODEL    (default model: llama-3.3-70b-versatile)
//   OPENAI_API_KEY / OPENAI_MODEL  (default model: gpt-4o-mini)

export interface LlmConfig {
  provider: "groq" | "openai";
  client: OpenAI;
  model: string;
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

// Returns null when no provider is configured, so callers can fall back to the
// deterministic rules-based report.
export function getLlm(): LlmConfig | null {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase().trim();
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasOpenai = Boolean(process.env.OPENAI_API_KEY);

  let provider: "groq" | "openai" | null = null;
  if (explicit === "groq" && hasGroq) provider = "groq";
  else if (explicit === "openai" && hasOpenai) provider = "openai";
  else if (!explicit && hasGroq) provider = "groq";
  else if (!explicit && hasOpenai) provider = "openai";
  // If they named a provider but its key is missing, fall back to the other.
  else if (hasGroq) provider = "groq";
  else if (hasOpenai) provider = "openai";

  if (!provider) return null;

  if (provider === "groq") {
    return {
      provider,
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: GROQ_BASE_URL,
      }),
      model: process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
    };
  }

  return {
    provider,
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL 1 — TRIAGE
// Reads the DNS scan + free-text problem statement.
// Returns raw string output for parseTriageResult() in interview.ts to validate.
// ─────────────────────────────────────────────────────────────────────────────

export async function callTriage(
  config: LlmConfig,
  userMessage: string
): Promise<string> {
  const response = await config.client.chat.completions.create({
    model: config.model,
    temperature: 0.2, // Low temperature — this is a structured selection task, not creative
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: TRIAGE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL 2 — DIAGNOSIS
// Reads the full picture: scan + problem statement + all answers + findings.
// Returns markdown string for rendering in the report.
// ─────────────────────────────────────────────────────────────────────────────

export async function callDiagnosis(
  config: LlmConfig,
  userMessage: string
): Promise<string> {
  const response = await config.client.chat.completions.create({
    model: config.model,
    temperature: 0.4, // Slightly higher — the diagnosis needs to reason and write, not just classify
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: DIAGNOSIS_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MESSAGE BUILDER — CALL 2
// Assembles the full diagnostic context into a single user message for Call 2.
// Kept here alongside the call function so the message shape and the call
// are always in sync.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanResult, Answers, Finding } from "./types";

export function buildDiagnosisUserMessage(
  scan: ScanResult,
  answers: Answers,
  behavioralFindings: Finding[],
  finalScore: number,
  problemStatement?: string
): string {
  // Map answer keys to human-readable slot IDs for LLM context.
  // The raw answers are passed as-is — the system prompt knows the slot IDs.
  return JSON.stringify(
    {
      domain: scan.domain,
      detectedProvider: scan.esp?.name ?? "unknown",
      finalScore,
      problemStatement: problemStatement?.trim() ||
        "(No problem stated — assume user wants to improve open rate while safely scaling volume.)",
      scanFindings: scan.findings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        severity: f.severity,
        detail: f.detail,
        fix: f.fix ?? null,
        evidence: f.evidence ?? null,
      })),
      behavioralFindings: behavioralFindings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        severity: f.severity,
        detail: f.detail,
        fix: f.fix ?? null,
      })),
      answers,
    },
    null,
    2
  );
}