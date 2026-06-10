// Content / spam-word linter — a deterministic, SpamAssassin-style scorer.
// It applies a curated subset of the real rules in lib/kb.ts to a draft email
// (subject + body) and returns an ADDITIVE score against the 5.0 spam threshold.
// This is an approximation of SpamAssassin for pre-send guidance — not a
// replacement for testing through mail-tester.com.

import { KB } from "./kb";

export interface LintHit {
  rule: string;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  advice: string;
}

export interface LintResult {
  score: number; // additive total
  threshold: number; // 5.0 — at/above is spam
  target: number; // 2.0 — aim below
  verdict: "good" | "borderline" | "spam";
  isHtml: boolean;
  hits: LintHit[];
}

function sev(score: number): LintHit["severity"] {
  if (score >= 2.5) return "critical";
  if (score >= 1.5) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

// Phrase rules carry real SpamAssassin scores from the KB where available.
const KB_SCORE: Record<string, number> = Object.fromEntries(
  KB.content.highRiskRules.map((r) => [r.rule, r.score])
);

interface PhraseRule {
  rule: string;
  re: RegExp;
  score: number;
  advice: string;
}

const PHRASE_RULES: PhraseRule[] = [
  { rule: "DEAR_WINNER", re: /\bdear\s+winner\b/i, score: KB_SCORE.DEAR_WINNER ?? 3.099, advice: 'Remove "Dear Winner" — a top spam phrase.' },
  { rule: "DEAR_FRIEND", re: /\bdear\s+friend\b/i, score: KB_SCORE.DEAR_FRIEND ?? 2.683, advice: 'Address the recipient by name instead of "Dear Friend".' },
  { rule: "DEAR_SOMETHING", re: /\bdear\s+(internet|investor|traveou?ler|customer|sir\/madam|valued (customer|member))\b/i, score: 2.1, advice: "Use a real personalized greeting, not a generic 'Dear ___'." },
  { rule: "FUZZY_PHARMACY", re: /\b(viagra|cialis|pharmacy|phentermine|tramadol)\b/i, score: KB_SCORE.FUZZY_PHARMACY ?? 2.96, advice: "Pharmaceutical terms are heavily spam-flagged. Remove them." },
  { rule: "BILLION_DOLLARS", re: /\b(million|billion)\s+(dollars?|usd|euros?)\b/i, score: KB_SCORE.BILLION_DOLLARS ?? 1.451, advice: 'Avoid "million/billion dollars" money-bait phrasing.' },
  { rule: "BODY_ENHANCEMENT", re: /\b(enlarge|enhancement)\b/i, score: KB_SCORE.BODY_ENHANCEMENT ?? 1.611, advice: "Remove body-enhancement language." },
  { rule: "EXCUSE_4", re: /\bto be removed,?\s+please\b/i, score: 2.399, advice: 'Replace "to be removed, please" with a proper List-Unsubscribe.' },
  { rule: "BANG_GUAR", re: /\bguarante(e|ed)!/i, score: KB_SCORE.BANG_GUAR ?? 1.0, advice: 'Drop the exclamation after "guarantee".' },
  { rule: "GUARANTEED_100", re: /\b100%\s*(guaranteed|free|satisfaction)\b/i, score: 0.9, advice: 'Avoid "100% guaranteed/free" claims.' },
  { rule: "STRONG_BUY", re: /\bstrong buy\b/i, score: 0.8, advice: 'Avoid stock-promotion language like "strong buy".' },
  { rule: "URG_BIZ", re: /\burgent\s+(business|request|proposal|reply)\b/i, score: 1.2, advice: "Remove urgent-business framing (classic scam pattern)." },
  { rule: "RISK_FREE", re: /\brisk[\s-]?free\b/i, score: 0.6, advice: 'Soften "risk-free" claims.' },
  { rule: "CONGRATS_WON", re: /\b(congratulations|you('| ?ha)ve won|you are a winner)\b/i, score: 1.3, advice: "Remove prize/winner language." },
];

// Lighter "marketing trigger" words — each adds a small score, capped so a normal
// email isn't nuked by one or two. Mirrors the user's original "free"/"now" idea.
const TRIGGER_WORDS = [
  "free", "act now", "buy now", "order now", "click here", "limited time",
  "cash", "earn money", "extra income", "no cost", "cheap", "discount",
  "winner", "urgent", "deal", "offer expires", "exclusive deal",
];

function stripHtml(s: string): string {
  return s.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
}

export function lintEmail(subjectRaw: string, bodyRaw: string): LintResult {
  const subject = (subjectRaw || "").trim();
  const body = bodyRaw || "";
  const isHtml = /<\s*(html|body|table|div|a|img|p|br|span)\b/i.test(body);
  const text = isHtml ? stripHtml(body) : body;
  const hits: LintHit[] = [];
  const add = (rule: string, score: number, detail: string, advice: string) =>
    hits.push({ rule, score, severity: sev(score), detail, advice });

  // ---- Subject rules ----
  if (!subject) {
    add("MISSING_SUBJECT", 2.195, "The email has no subject line.", "Add a clear, specific subject.");
  } else {
    const letters = subject.replace(/[^a-z]/gi, "");
    if (letters.length >= 10 && subject === subject.toUpperCase()) {
      add("SUBJ_ALL_CAPS", 0.5, "Subject line is ALL CAPS.", "Use normal sentence case in the subject.");
    }
    if (/!/.test(subject) && /\?/.test(subject)) {
      add("PLING_QUERY", 0.45, "Subject mixes ! and ? — a spam pattern.", "Use one calm subject without ?! pile-ups.");
    }
    if (/^\s*\$/.test(subject)) {
      add("SUBJ_DOLLARS", 0.45, "Subject starts with a $ sign.", "Don't open the subject with a money symbol.");
    }
    if (/!{2,}/.test(subject)) {
      add("SUBJ_MANY_BANGS", 0.4, "Subject has multiple exclamation marks.", "Remove the extra exclamation marks.");
    }
    if (/\b(\w\.){3,}\w\b/.test(subject)) {
      add("GAPPY_SUBJECT", 0.6, "Subject contains g.a.p.p.y / dotted text.", "Write words normally, not d.o.t.t.e.d.");
    }
  }

  // ---- Phrase rules (subject + body) ----
  const haystack = `${subject}\n${text}`;
  for (const r of PHRASE_RULES) {
    if (r.re.test(haystack)) add(r.rule, r.score, `Matched spam phrase rule ${r.rule}.`, r.advice);
  }

  // ---- Trigger words (capped) ----
  const lower = haystack.toLowerCase();
  const matched = TRIGGER_WORDS.filter((w) => lower.includes(w));
  if (matched.length) {
    const score = Math.min(1.5, matched.length * 0.3);
    add(
      "TRIGGER_WORDS",
      score,
      `Marketing/urgency trigger words present: ${matched.slice(0, 8).join(", ")}.`,
      "Rephrase or remove these; lead with genuine value instead of urgency."
    );
  }

  // ---- Body emphasis ----
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations >= 4) {
    add("BODY_MANY_BANGS", Math.min(1.0, 0.2 * exclamations), `Body has ${exclamations} exclamation marks.`, "Cut the exclamation marks down to at most one or two.");
  }
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => w !== "HTTPS");
  if (capsWords.length >= 3) {
    add("BODY_ALL_CAPS", 0.7, `Body shouts in ALL CAPS (${capsWords.length} words).`, "Use normal case; reserve caps for nothing.");
  }

  // ---- Links ----
  const urls = body.match(/https?:\/\/[^\s"'<>)]+/gi) || [];
  if (urls.length > 8) {
    add("MANY_LINKS", 0.6, `Email contains ${urls.length} links.`, "Reduce the number of links; many links look promotional.");
  }
  const shorteners = urls.filter((u) => /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly)\b/i.test(u));
  if (shorteners.length) {
    add("LINK_SHORTENER", Math.min(1.2, shorteners.length * 0.6), `Uses ${shorteners.length} link shortener(s).`, "Use full branded links on your own domain instead of shorteners (often blocklisted).");
  }

  // ---- HTML structure ----
  if (isHtml) {
    const imgCount = (body.match(/<img\b/gi) || []).length;
    const textLen = text.replace(/\s+/g, " ").trim().length;
    if (imgCount >= 1 && textLen < 100) {
      add("HTML_IMAGE_ONLY", 1.5, `Image-heavy email with very little text (${textLen} chars, ${imgCount} image(s)).`, "Add real text; ensure the email reads with images disabled.");
    } else if (imgCount >= 1 && textLen < 400) {
      add("HTML_IMAGE_RATIO", 0.8, "Low text-to-image ratio.", "Increase the text relative to images.");
    }
    if (!/<\s*html/i.test(body) && /<\s*(table|div|p|a|img)\b/i.test(body)) {
      add("HTML_MIME_NO_HTML_TAG", 0.4, "HTML markup without a wrapping <html> tag.", "Send well-formed HTML with proper <html> structure.");
    }
    if (/color\s*:\s*#?(f{3,6}|fff)/i.test(body) && /background/i.test(body)) {
      add("HTML_FONT_LOW_CONTRAST", 1.0, "Possible near-white text on background (hidden-text pattern).", "Ensure text has strong contrast; never hide text.");
    }
  }

  const score = Math.round(hits.reduce((s, h) => s + h.score, 0) * 1000) / 1000;
  const verdict: LintResult["verdict"] = score >= 5 ? "spam" : score >= 2 ? "borderline" : "good";

  // Sort worst-first.
  hits.sort((a, b) => b.score - a.score);

  return { score, threshold: 5.0, target: 2.0, verdict, isHtml, hits };
}
