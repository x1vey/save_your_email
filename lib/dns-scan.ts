import { Resolver } from "node:dns/promises";
import type { Finding, ScanResult } from "./types";
import { detectEsp, GENERIC_SELECTORS } from "./esp";

// Use a dedicated resolver with public DNS so results are consistent
// regardless of the host's local resolver config.
function makeResolver(): Resolver {
  const r = new Resolver({ timeout: 5000, tries: 2 });
  r.setServers(["1.1.1.1", "8.8.8.8"]);
  return r;
}

async function safeResolveTxt(r: Resolver, name: string): Promise<string[]> {
  try {
    const records = await r.resolveTxt(name);
    // Each TXT record is an array of string chunks that must be concatenated.
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

async function safeResolveMx(r: Resolver, name: string) {
  try {
    return await r.resolveMx(name);
  } catch {
    return [];
  }
}

export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.split("/")[0];
  // If they pasted an email address, take the domain part.
  if (d.includes("@")) d = d.split("@")[1];
  return d;
}

// ---- SPF parsing -----------------------------------------------------------

function parseSpf(records: string[]): {
  record: string | null;
  includes: string[];
  all: string | null;
  lookupCount: number;
} {
  const spf = records.find((t) => t.toLowerCase().startsWith("v=spf1"));
  if (!spf) return { record: null, includes: [], all: null, lookupCount: 0 };
  const terms = spf.split(/\s+/);
  const includes: string[] = [];
  let all: string | null = null;
  // Mechanisms that each cost a DNS lookup against the SPF 10-lookup limit.
  let lookupCount = 0;
  for (const term of terms) {
    const t = term.toLowerCase();
    if (t.startsWith("include:")) {
      includes.push(term.slice(8));
      lookupCount++;
    } else if (/^(a|mx|ptr|exists|redirect)/.test(t)) {
      lookupCount++;
    } else if (/all$/.test(t)) {
      all = t.replace("all", "");
    }
  }
  return { record: spf, includes, all, lookupCount };
}

// ---- DMARC parsing ---------------------------------------------------------

function parseDmarc(records: string[]): {
  record: string | null;
  policy: string | null;
  pct: number;
  rua: boolean;
  sp: string | null;
} {
  const dmarc = records.find((t) => t.toLowerCase().startsWith("v=dmarc1"));
  if (!dmarc) return { record: null, policy: null, pct: 100, rua: false, sp: null };
  const tags: Record<string, string> = {};
  for (const part of dmarc.split(";")) {
    const [k, v] = part.split("=").map((s) => s?.trim());
    if (k && v) tags[k.toLowerCase()] = v;
  }
  return {
    record: dmarc,
    policy: tags["p"] ?? null,
    pct: tags["pct"] ? Number(tags["pct"]) : 100,
    rua: Boolean(tags["rua"]),
    sp: tags["sp"] ?? null,
  };
}

// ---- DKIM probing ----------------------------------------------------------

async function probeDkim(
  r: Resolver,
  domain: string,
  selectors: string[]
): Promise<{ selector: string; record: string } | null> {
  for (const sel of selectors) {
    const records = await safeResolveTxt(r, `${sel}._domainkey.${domain}`);
    const dk = records.find(
      (t) => t.toLowerCase().includes("v=dkim1") || t.toLowerCase().includes("p=")
    );
    if (dk) return { selector: sel, record: dk };
  }
  return null;
}

// ---- Main scan -------------------------------------------------------------

export async function scanDomain(rawDomain: string): Promise<ScanResult> {
  const domain = normalizeDomain(rawDomain);
  const r = makeResolver();
  const findings: Finding[] = [];

  const [mxRecords, rootTxt, dmarcTxt] = await Promise.all([
    safeResolveMx(r, domain),
    safeResolveTxt(r, domain),
    safeResolveTxt(r, `_dmarc.${domain}`),
  ]);

  const mxTargets = mxRecords.map((m) => m.exchange.toLowerCase());
  const spf = parseSpf(rootTxt);
  const esp = detectEsp(mxTargets, spf.includes);

  // ---- MX / routing ----
  if (mxRecords.length === 0) {
    findings.push({
      id: "mx-missing",
      category: "routing",
      title: "No MX records found",
      severity: "fail",
      detail:
        "This domain has no MX records, so it cannot receive email. If you only send (not receive) on this domain, that may be intentional — but it also means bounce and reply handling is broken.",
      fix: "Add MX records pointing at your mail provider (e.g. Google Workspace or Microsoft 365).",
      weight: 10,
    });
  } else {
    findings.push({
      id: "mx-ok",
      category: "routing",
      title: `MX records present (${mxRecords.length})`,
      severity: "ok",
      detail: `Mail routing is configured${esp ? ` via ${esp.name}` : ""}.`,
      evidence: mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map((m) => `${m.priority}\t${m.exchange}`)
        .join("\n"),
      weight: 0,
    });
  }

  // ---- SPF ----
  if (!spf.record) {
    findings.push({
      id: "spf-missing",
      category: "auth",
      title: "No SPF record",
      severity: "fail",
      detail:
        "SPF tells receiving servers which IPs are allowed to send for your domain. Without it, mailbox providers can't verify your sending sources and are far more likely to spam-folder or reject your mail.",
      fix:
        "Publish a TXT record at the root of your domain, e.g. `v=spf1 include:_spf.google.com -mall` (swap in your actual sending provider's include).",
      weight: 20,
    });
  } else {
    if (spf.all === "+" || spf.all === null) {
      findings.push({
        id: "spf-soft",
        category: "auth",
        title: "SPF has no enforcing 'all' mechanism",
        severity: "warn",
        detail:
          "Your SPF record doesn't end in a restrictive `-all` (hardfail) or `~all` (softfail). This effectively allows anyone to send as you, weakening the protection.",
        fix: "End your SPF record with `-all` (recommended) or at least `~all`.",
        evidence: spf.record,
        weight: 8,
      });
    } else if (spf.all === "~") {
      findings.push({
        id: "spf-softfail",
        category: "auth",
        title: "SPF uses softfail (~all)",
        severity: "warn",
        detail:
          "`~all` (softfail) is acceptable but `-all` (hardfail) gives stronger protection against spoofing once you're confident all your senders are listed.",
        fix: "Once all legitimate senders are in your SPF record, tighten `~all` to `-all`.",
        evidence: spf.record,
        weight: 3,
      });
    } else {
      findings.push({
        id: "spf-ok",
        category: "auth",
        title: "SPF record present and enforcing",
        severity: "ok",
        detail: "SPF is published with a hardfail policy.",
        evidence: spf.record,
        weight: 0,
      });
    }

    if (spf.lookupCount > 10) {
      findings.push({
        id: "spf-lookups",
        category: "auth",
        title: `SPF exceeds the 10 DNS-lookup limit (${spf.lookupCount})`,
        severity: "fail",
        detail:
          "SPF allows a maximum of 10 DNS lookups. Beyond that, SPF returns a PermError and is treated as if it doesn't exist — silently breaking authentication.",
        fix:
          "Flatten or consolidate your includes, remove unused senders, or use an SPF-flattening service to get under 10 lookups.",
        weight: 12,
      });
    }
  }

  // ---- DMARC ----
  const dmarc = parseDmarc(dmarcTxt);
  if (!dmarc.record) {
    findings.push({
      id: "dmarc-missing",
      category: "auth",
      title: "No DMARC record",
      severity: "fail",
      detail:
        "DMARC ties SPF and DKIM together and tells receivers what to do with mail that fails. As of 2024, Gmail and Yahoo REQUIRE a DMARC record for bulk senders — without it, your mail to them can be rejected outright.",
      fix:
        "Publish a TXT record at `_dmarc.yourdomain.com`. Start safely with `v=DMARC1; p=none; rua=mailto:you@yourdomain.com` to collect reports, then tighten to quarantine/reject.",
      weight: 20,
    });
  } else {
    if (dmarc.policy === "none") {
      findings.push({
        id: "dmarc-none",
        category: "auth",
        title: "DMARC policy is p=none (monitoring only)",
        severity: "warn",
        detail:
          "`p=none` satisfies the Gmail/Yahoo requirement but provides no actual protection — spoofed mail still gets delivered. It's the right starting point, but the goal is to move to quarantine or reject.",
        fix:
          "After reviewing your DMARC aggregate reports and confirming legitimate mail passes, move to `p=quarantine` and eventually `p=reject`.",
        evidence: dmarc.record,
        weight: 6,
      });
    } else {
      findings.push({
        id: "dmarc-enforced",
        category: "auth",
        title: `DMARC enforced (p=${dmarc.policy})`,
        severity: "ok",
        detail: "DMARC is published with an enforcing policy.",
        evidence: dmarc.record,
        weight: 0,
      });
    }
    if (!dmarc.rua) {
      findings.push({
        id: "dmarc-no-rua",
        category: "auth",
        title: "DMARC has no reporting address (rua)",
        severity: "warn",
        detail:
          "Without a `rua=` tag you receive no aggregate reports, so you're blind to who is sending as your domain and whether legitimate mail is failing.",
        fix: "Add `rua=mailto:dmarc@yourdomain.com` to start receiving aggregate reports.",
        weight: 3,
      });
    }
  }

  // ---- DKIM (probe) ----
  const selectors = esp ? [...esp.likelySelectors, ...GENERIC_SELECTORS] : GENERIC_SELECTORS;
  const dkim = await probeDkim(r, domain, [...new Set(selectors)]);
  if (dkim) {
    findings.push({
      id: "dkim-ok",
      category: "auth",
      title: `DKIM key found (selector: ${dkim.selector})`,
      severity: "ok",
      detail:
        "A DKIM public key is published, which lets receivers cryptographically verify your messages weren't tampered with.",
      evidence: dkim.record.length > 120 ? dkim.record.slice(0, 120) + "…" : dkim.record,
      weight: 0,
    });
  } else {
    findings.push({
      id: "dkim-unknown",
      category: "auth",
      title: "No DKIM key found at common selectors",
      severity: "warn",
      detail:
        `We probed the usual selectors${
          esp ? ` for ${esp.name}` : ""
        } but didn't find a DKIM key. DKIM may still exist under a custom selector we don't know — but if it genuinely isn't set up, your mail is unauthenticated and very likely to be spam-foldered.`,
      fix:
        "Enable DKIM signing in your email provider's admin console and publish the public key it gives you. If you know your selector, you can verify it manually.",
      weight: 14,
    });
  }

  // ---- Score ----
  // Start at 100, deduct the weight of every non-ok finding.
  const deductions = findings
    .filter((f) => f.severity === "fail" || f.severity === "warn")
    .reduce((sum, f) => sum + f.weight, 0);
  const techScore = Math.max(0, Math.min(100, 100 - deductions));

  return {
    domain,
    scannedAt: new Date().toISOString(),
    esp,
    findings,
    score: techScore,
    techScore,
  };
}
