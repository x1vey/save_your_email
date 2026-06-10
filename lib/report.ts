import type { Answers, Finding, ScanResult } from "./types";

export function behavioralFindings(answers: Answers, scan: ScanResult): Finding[] {
  const f: Finding[] = [];
  const a = answers;
  const listSource = Array.isArray(a.list_source) ? a.list_source : [];
  const content = Array.isArray(a.content) ? a.content : [];

  // ── LIST SOURCE ────────────────────────────────────────────────────────────

  if (listSource.includes("purchased")) {
    f.push({
      id: "list-purchased",
      category: "behavior",
      title: "Purchased or scraped list",
      severity: "fail",
      detail:
        "Purchased and scraped lists are the fastest route to spam traps and complaints. They are prohibited by virtually every ESP and by CAN-SPAM/GDPR. A single spam-trap hit can damage your domain reputation for weeks.",
      fix:
        "Stop mailing the purchased portion immediately. Rebuild your list with explicit opt-in. If you must contact cold prospects, use a separate isolated domain so it cannot poison your main one.",
      weight: 25,
    });
  }

  // ── WARMUP ─────────────────────────────────────────────────────────────────

  if (a.warmup === "no" && (a.domain_age === "new" || a.volume === "5k+")) {
    f.push({
      id: "no-warmup",
      category: "behavior",
      title: "No warmup on a new or high-volume domain",
      severity: "fail",
      detail:
        "Sending high volume from a domain with no reputation history triggers rate-limiting and bulk-foldering. Mailbox providers expect volume to ramp gradually over weeks.",
      fix:
        "Ramp sending over 4–6 weeks: start at 50–200/day with your most engaged contacts and roughly double every 2–3 days while open rate stays above 20% and complaints stay below 0.1%.",
      weight: 15,
    });
  }

  // ── LIST HYGIENE ───────────────────────────────────────────────────────────

  if (a.list_hygiene === "none") {
    f.push({
      id: "no-hygiene",
      category: "behavior",
      title: "Bounces and inactive contacts not removed",
      severity: "fail",
      detail:
        "Repeatedly mailing addresses that hard-bounce or never engage signals to mailbox providers that you don't maintain your list — a strong negative reputation signal that compounds over time.",
      fix:
        "Automatically suppress hard bounces immediately. Sunset contacts with no engagement in 90–180 days. Keep a permanent suppression list to prevent re-import.",
      weight: 12,
    });
  } else if (a.list_hygiene === "manual") {
    f.push({
      id: "manual-hygiene",
      category: "behavior",
      title: "List hygiene is manual",
      severity: "warn",
      detail:
        "Manual cleaning lets dead addresses and disengaged contacts linger between cleanups, dragging on reputation.",
      fix: "Automate hard-bounce suppression and engagement-based sunsetting in your ESP.",
      weight: 5,
    });
  }

  // ── ADDRESS VERIFICATION ───────────────────────────────────────────────────

  if (a.verify === "no" && (a.role === "cold" || listSource.includes("imported"))) {
    f.push({
      id: "no-verify",
      category: "behavior",
      title: "Addresses not verified before sending",
      severity: "warn",
      detail:
        "Unverified cold or imported lists carry invalid addresses and spam traps. High bounce rates from a single send can trigger blocks.",
      fix:
        "Run the list through an email verification service (ZeroBounce, NeverBounce, Kickbox) and remove invalid or risky addresses before the first send.",
      weight: 8,
    });
  }

  // ── UNSUBSCRIBE COMPLIANCE ─────────────────────────────────────────────────

  if (a.unsub === "none") {
    f.push({
      id: "no-unsub",
      category: "compliance",
      title: "No working unsubscribe",
      severity: "fail",
      detail:
        "A functioning unsubscribe is legally required (CAN-SPAM/GDPR) and since 2024 Gmail and Yahoo require a one-click List-Unsubscribe header for bulk senders. Missing it causes outright blocking and complaints.",
      fix:
        "Add a visible unsubscribe link and enable the one-click List-Unsubscribe header. Most ESPs add this automatically when configured.",
      weight: 15,
    });
  } else if (a.unsub === "link") {
    f.push({
      id: "no-oneclick",
      category: "compliance",
      title: "Missing one-click List-Unsubscribe header",
      severity: "warn",
      detail:
        "You have a visible link but not the one-click header Gmail and Yahoo now require. Frustrated recipients hit 'spam' instead of unsubscribing, which is far more damaging.",
      fix: "Enable the List-Unsubscribe and List-Unsubscribe-Post headers in your ESP settings.",
      weight: 7,
    });
  }

  // ── FROM IDENTITY ──────────────────────────────────────────────────────────

  if (a.from_identity === "free") {
    f.push({
      id: "free-from",
      category: "compliance",
      title: "Sending from a free mailbox address",
      severity: "fail",
      detail:
        "Sending bulk mail from a gmail.com or outlook.com From address fails DMARC alignment — those domains publish strict DMARC — and looks like spoofing. It will be rejected.",
      fix: "Send from your own authenticated domain instead of a free mailbox.",
      weight: 14,
    });
  }

  // ── COMPLAINT RATE ─────────────────────────────────────────────────────────

  if (a.complaints === "over") {
    f.push({
      id: "high-complaints",
      category: "reputation",
      title: "Spam-complaint rate above 0.3%",
      severity: "fail",
      detail:
        "Google enforces at 0.30% complaint rate (warning at 0.10%, target under 0.08%). At 0.3%+ you will see severe foldering and blocks across Gmail.",
      fix:
        "Stop mailing disengaged segments immediately, make unsubscribe effortless, and only send content recipients signed up for. Drive the rate well below 0.10%.",
      weight: 14,
    });
  } else if (a.complaints === "mid") {
    f.push({
      id: "elevated-complaints",
      category: "reputation",
      title: "Spam-complaint rate between 0.1% and 0.3%",
      severity: "warn",
      detail:
        "You are past Google's 0.10% warning threshold but below the 0.30% enforcement line. Reputation is already being eroded.",
      fix:
        "Tighten segmentation, make unsubscribe effortless, and cut disengaged contacts to push the rate back under 0.08%.",
      weight: 7,
    });
  } else if (a.complaints === "unknown" && a.role !== "transactional") {
    f.push({
      id: "complaints-untracked",
      category: "reputation",
      title: "Complaint rate not tracked",
      severity: "warn",
      detail:
        "If you don't monitor complaints you cannot catch a reputation problem before it becomes a block.",
      fix:
        "Enable Google Postmaster Tools and your ESP's complaint reporting to monitor the rate continuously.",
      weight: 5,
    });
  }

  // ── CONTENT RISK ───────────────────────────────────────────────────────────

  if (content.includes("spamwords")) {
    f.push({
      id: "spam-words",
      category: "content",
      title: "Spam-trigger language in content",
      severity: "warn",
      detail:
        "All-caps subject lines, excessive punctuation, and urgency words add to spam filter scoring. Only use them if your domain has strong surplus reputation.",
      fix:
        "Write naturally. Avoid all-caps and exclamation pile-ups. Only use urgency language if you have strong domain reputation as a buffer.",
      weight: 6,
    });
  }

  if (content.includes("imageheavy") || a.image_count === "many") {
    f.push({
      id: "image-heavy",
      category: "content",
      title: "Image-only or image-heavy emails",
      severity: "warn",
      detail:
        "Single-image emails with little text are a classic spam pattern. This costs significant deliverability credit — credit you may not have.",
      fix:
        "Maintain a healthy text-to-image ratio. Ensure the email reads well with images disabled. Consider switching to plain text while rebuilding reputation.",
      weight: 5,
    });
  } else if (a.image_count === "few") {
    f.push({
      id: "multiple-images",
      category: "content",
      title: "Multiple images in email",
      severity: "info",
      detail:
        "Multiple images add deliverability cost. Fine on a mature high-reputation domain, but on a new or recovering domain it compounds other issues.",
      fix: "Keep images where they add real value. Monitor open rates when adding or removing them.",
      weight: 2,
    });
  }

  if (content.includes("manylinks") || a.link_density === "many") {
    f.push({
      id: "link-density",
      category: "content",
      title: "High link density",
      severity: "warn",
      detail:
        "Many links per email is a marketing pattern that spam filters weigh negatively. URL shorteners are heavily abused by spammers and frequently blocklisted.",
      fix:
        "Use full branded links on your own domain instead of shorteners. Keep link count to what the email genuinely needs — a single strong CTA performs better than many weak ones.",
      weight: 5,
    });
  }

  if (content.includes("attachments")) {
    f.push({
      id: "attachments",
      category: "content",
      title: "Emails include attachments",
      severity: "warn",
      detail:
        "Attachments significantly increase spam scores and are blocked or quarantined by many corporate mail servers.",
      fix:
        "Host files on your website or a cloud service and link to them instead of attaching directly.",
      weight: 6,
    });
  }

  // ── SEGMENTATION ───────────────────────────────────────────────────────────

  if (a.seg === "no" && (a.role === "marketing" || a.role === "mixed")) {
    f.push({
      id: "no-segmentation",
      category: "behavior",
      title: "Emailing the entire list without segmentation",
      severity: "warn",
      detail:
        "Blasting disengaged contacts depresses open rates and engagement signals, which mailbox providers weigh heavily. Over time this erodes sending reputation.",
      fix:
        "Segment by engagement. Prioritise contacts who opened recently. Sunset anyone with no opens in 90 days — they are a net negative on your reputation.",
      weight: 6,
    });
  }

  // ── DEDICATED IP ───────────────────────────────────────────────────────────

  if (
    a.ip_type === "dedicated" &&
    (a.domain_age === "new" || a.volume === "lt50" || a.volume === "50-500")
  ) {
    f.push({
      id: "cold-dedicated-ip",
      category: "reputation",
      title: "Dedicated IP at low volume",
      severity: "warn",
      detail:
        "A cold dedicated IP has no reputation and below ~10k emails/month performs worse than a warm shared IP. There is not enough volume to build and sustain its reputation.",
      fix:
        "Switch to a shared IP on a reputable ESP until you consistently exceed ~10k/month, then revisit a dedicated IP with a proper 4–8 week warmup.",
      weight: 8,
    });
  }

  // ── OPEN RATE ──────────────────────────────────────────────────────────────
  // Severity is warn not fail — low open rate is a symptom, not a root cause.
  // The LLM reasons about what is causing it from the full picture.

  if (a.open_rate === "low") {
    f.push({
      id: "low-open-rate",
      category: "reputation",
      title: "Open rate under 15%",
      severity: "warn",
      detail:
        "An open rate below 15% is a strong signal that mail is landing in spam, the list is disengaged, or both. Low engagement feeds back into worse reputation over time.",
      fix:
        "Do not scale volume until the root cause is identified. Check authentication, list hygiene, and content first. Email only your most engaged contacts while diagnosing.",
      weight: 10,
    });
  } else if (a.open_rate === "unknown") {
    f.push({
      id: "open-rate-untracked",
      category: "reputation",
      title: "Open rate not tracked",
      severity: "warn",
      detail:
        "Without an open-rate signal you cannot tell whether you are reaching the inbox or how your reputation is trending.",
      fix:
        "Enable open tracking (on a healthy domain) or use Google Postmaster Tools to monitor delivery and reputation.",
      weight: 4,
    });
  }

  // ── DROP PATTERN ───────────────────────────────────────────────────────────

  if (a.drop_pattern === "sudden") {
    f.push({
      id: "sudden-drop",
      category: "reputation",
      title: "Sudden drop in open rate or deliverability",
      severity: "fail",
      detail:
        "A sudden drop — overnight or within days — typically points to an IP or domain being flagged or blacklisted. This is a different path from a slow decline.",
      fix:
        "Check your domain and sending IP against major blacklists immediately (MXToolbox). If blacklisted, identify and fix the cause before requesting delisting. If not blacklisted, check whether your sending IP changed or sending volume spiked.",
      weight: 12,
    });
  } else if (a.drop_pattern === "gradual") {
    f.push({
      id: "gradual-decline",
      category: "reputation",
      title: "Gradual decline in deliverability over time",
      severity: "warn",
      detail:
        "A gradual decline over weeks or months points to domain reputation erosion — typically from sending to disengaged contacts, rising complaint rates, or content quality drift. Not usually an IP or blacklist problem.",
      fix:
        "Focus on list hygiene and engagement quality. Suppress unengaged contacts, strip content risk, and send only to your most active recipients while rebuilding. This takes 4–6 weeks of clean sending.",
      weight: 8,
    });
  } else if (a.drop_pattern === "always_low") {
    f.push({
      id: "always-low",
      category: "reputation",
      title: "Deliverability has always been low",
      severity: "warn",
      detail:
        "If it never worked well the issue is likely foundational — authentication setup, domain reputation from day one, or list quality from the start, rather than a recent change.",
      fix:
        "Start with authentication (SPF/DKIM/DMARC), then list quality, then content. Build from the foundation up.",
      weight: 7,
    });
  }

  // ── CLICK TRACKING ─────────────────────────────────────────────────────────

  if (a.click_tracking === "yes" && (a.domain_age === "new" || a.open_rate === "low")) {
    f.push({
      id: "click-tracking-risk",
      category: "content",
      title: "Click tracking enabled on a low-reputation domain",
      severity: "warn",
      detail:
        "Click tracking rewrites your links through a tracking subdomain. On a new or low-reputation domain this adds a third-party domain to every link — a deliverability cost you cannot afford when you have no surplus reputation.",
      fix:
        "Turn off click tracking temporarily. The data insight is not worth the deliverability cost while your domain is building or rebuilding reputation.",
      weight: 5,
    });
  }

  // ── BOUNCE TYPE ────────────────────────────────────────────────────────────

  if (a.bounce_type === "hard") {
    f.push({
      id: "hard-bounces",
      category: "behavior",
      title: "Mostly hard bounces",
      severity: "fail",
      detail:
        "A high proportion of hard bounces indicates list quality problems — bad addresses, very old contacts, or a list that was never verified. Hard bounce rates above 2% require immediate action.",
      fix:
        "Suppress all hard-bounced addresses permanently. Run your active list through an email verification service to identify and remove remaining invalids before the next send.",
      weight: 10,
    });
  } else if (a.bounce_type === "soft") {
    f.push({
      id: "soft-bounces",
      category: "reputation",
      title: "Mostly soft bounces",
      severity: "warn",
      detail:
        "A high proportion of soft bounces suggests receiving servers are throttling or deferring your mail — a reputation or volume signal. The addresses exist but your mail is being held.",
      fix:
        "Reduce sending volume and check your complaint rate and domain reputation via Google Postmaster Tools. Soft bounces persisting over 72 hours should be treated as hard bounces.",
      weight: 7,
    });
  } else if (a.bounce_type === "unknown") {
    f.push({
      id: "bounces-untracked",
      category: "behavior",
      title: "Bounce rate not tracked",
      severity: "warn",
      detail:
        "Not tracking bounces means hard-bounced addresses may still be in your active list, silently damaging your reputation with every send.",
      fix: "Enable bounce tracking in your ESP and set up automatic suppression of hard bounces.",
      weight: 6,
    });
  }

  // ── RESEND TO NON-OPENERS ──────────────────────────────────────────────────

  if (a.resend_unopened === "yes") {
    f.push({
      id: "resend-non-openers",
      category: "behavior",
      title: "Resending to contacts who did not open",
      severity: "warn",
      detail:
        "Each non-open is a weak negative engagement signal. Resending to non-openers compounds it — you are sending again to people who already ignored you, multiplying the negative signal.",
      fix:
        "Stop resending to chronic non-openers. If you want to retry, change the subject line and only retry once, and only for contacts who have opened at least once before.",
      weight: 6,
    });
  }

  // ── RESEND TO BOUNCED ──────────────────────────────────────────────────────

  if (a.resend_bounced === "yes") {
    f.push({
      id: "resend-bounced",
      category: "behavior",
      title: "Resending to addresses that have bounced",
      severity: "fail",
      detail:
        "Repeatedly sending to hard-bounced addresses directly damages sender reputation and can lead to ESP account suspension.",
      fix:
        "Permanently suppress all hard-bounced addresses immediately. Check your ESP suppression settings — automatic hard-bounce suppression should be on by default.",
      weight: 12,
    });
  } else if (a.resend_bounced === "unsure") {
    f.push({
      id: "resend-bounced-unknown",
      category: "behavior",
      title: "Bounce suppression status unknown",
      severity: "warn",
      detail:
        "If you are not sure whether your system suppresses bounced addresses there is a real risk you are mailing dead addresses and damaging your reputation.",
      fix:
        "Check your ESP's suppression list settings and bounce handling configuration. Confirm hard bounces are suppressed automatically.",
      weight: 5,
    });
  }

  // ── SUBDOMAIN vs ROOT ──────────────────────────────────────────────────────

  if (a.subdomain_vs_root === "root" && (a.volume === "500-5k" || a.volume === "5k+")) {
    f.push({
      id: "root-domain-sending",
      category: "behavior",
      title: "Sending bulk email from root domain",
      severity: "warn",
      detail:
        "Sending high volume from your root domain means any reputation damage from bulk sending directly affects your main domain — website, transactional email, brand trust.",
      fix:
        "Consider moving bulk sending to a subdomain (e.g. mail.yourdomain.com). This isolates bulk sending reputation from your root domain.",
      weight: 5,
    });
  }

  // ── SENDING FREQUENCY ──────────────────────────────────────────────────────

  if (a.sending_frequency === "restarting") {
    f.push({
      id: "restarting-after-gap",
      category: "behavior",
      title: "Restarting sending after a long gap",
      severity: "warn",
      detail:
        "A long gap in sending means your list has gone cold and your domain reputation has partially decayed. Sending at previous volume immediately is likely to cause a deliverability crash.",
      fix:
        "Treat this like a new domain warmup. Start with your most recently engaged contacts at low volume and ramp gradually. Do not blast the full list on the first send back.",
      weight: 8,
    });
  }

  // ── UNSUBSCRIBE RATE ───────────────────────────────────────────────────────
  // Unsubscribes are a list relevance and content signal, not a deliverability
  // signal. Framed accordingly so the LLM reasons about it correctly.

  if (a.unsubscribe_rate === "rising") {
    f.push({
      id: "rising-unsubscribes",
      category: "reputation",
      title: "Unsubscribe rate is rising",
      severity: "warn",
      detail:
        "Rising unsubscribes mean recipients are getting and reading your email but choosing to leave. This is a list relevance or content signal — emails are landing, people are just not wanting them. It will affect future deliverability as the list becomes less engaged.",
      fix:
        "Look at what changed recently — frequency, content type, list source, or targeting. Unsubscribes are feedback: something you are sending is not what this audience wants.",
      weight: 5,
    });
  } else if (a.unsubscribe_rate === "high") {
    f.push({
      id: "high-unsubscribes",
      category: "reputation",
      title: "High unsubscribe rate",
      severity: "warn",
      detail:
        "A high unsubscribe rate means people are receiving and reading your emails but actively opting out. Your emails are landing — people just do not want them. This is a list-audience mismatch or content relevance problem, not an inbox placement problem.",
      fix:
        "Review list quality (did these contacts genuinely opt in for this content?), sending frequency (are you sending too often?), and content relevance (is what you are sending what they expected?). Better segmentation and more targeted content will reduce this.",
      weight: 6,
    });
  }

  return f;
}

// Tier-weighted scoring with authentication gate.
// Auth failures cap the score at 40 — no amount of good behavior
// compensates for broken authentication.
export function computeFinalScore(scan: ScanResult, behavioral: Finding[]): number {
  const all = [...scan.findings, ...behavioral];

  const authFails = all.filter(
    (x) => x.category === "auth" && x.severity === "fail"
  );
  const cap = authFails.length > 0 ? 40 : 100;

  const tierMultiplier: Record<string, number> = {
    auth: 1.5,
    compliance: 1.2,
    behavior: 1.0,
    routing: 1.0,
    reputation: 0.9,
    content: 0.7,
  };

  const deductions = all
    .filter((x) => x.severity === "fail" || x.severity === "warn")
    .reduce((sum, x) => {
      const mult = tierMultiplier[x.category] ?? 1.0;
      const severityMult = x.severity === "warn" ? 0.5 : 1.0;
      return sum + x.weight * mult * severityMult;
    }, 0);

  const scaled = (deductions / 100) * cap;
  return Math.max(0, Math.min(cap, Math.round(cap - scaled)));
}

export function buildFallbackMarkdown(
  scan: ScanResult,
  behavioral: Finding[],
  finalScore: number,
  problemStatement?: string
): string {
  const all = [...scan.findings, ...behavioral];
  const fails = all.filter((f) => f.severity === "fail");
  const warns = all.filter((f) => f.severity === "warn");
  const oks = all.filter((f) => f.severity === "ok");

  const lines: string[] = [];
  lines.push(`# Deliverability report for ${scan.domain}`);
  lines.push("");
  lines.push(`**Overall health score: ${finalScore}/100**`);
  if (scan.esp) {
    lines.push(`\nDetected provider: **${scan.esp.name}** (via ${scan.esp.source.toUpperCase()}).`);
  }
  if (problemStatement?.trim()) {
    lines.push(`\n**Problem reported:** ${problemStatement.trim()}`);
  }
  lines.push("");

  if (fails.length) {
    lines.push(`## 🔴 Fix these first (${fails.length})`);
    for (const f of fails) {
      lines.push(`### ${f.title}`);
      lines.push(f.detail);
      if (f.fix) lines.push(`\n**Fix:** ${f.fix}`);
      if (f.evidence) lines.push(`\n\`\`\`\n${f.evidence}\n\`\`\``);
      lines.push("");
    }
  }
  if (warns.length) {
    lines.push(`## 🟡 Address these (${warns.length})`);
    for (const f of warns) {
      lines.push(`### ${f.title}`);
      lines.push(f.detail);
      if (f.fix) lines.push(`\n**Fix:** ${f.fix}`);
      lines.push("");
    }
  }
  if (oks.length) {
    lines.push(`## 🟢 Looking good (${oks.length})`);
    for (const f of oks) lines.push(`- **${f.title}** — ${f.detail}`);
    lines.push("");
  }
  return lines.join("\n");
}