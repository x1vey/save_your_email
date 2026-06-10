// Email Deliverability Knowledge Base — machine-usable core.
// Transcribed from the curated KB (docs/knowledge-base.html), itself sourced from
// Apache SpamAssassin rule sets, RFC 7208/6376/7489/8058/8461/8460, the Google &
// Yahoo Feb-2024 bulk-sender requirements, Google Postmaster Tools, and MS SNDS.
//
// This is the single source of truth for thresholds, scores, and schedules used
// across scoring (lib/report.ts), the question flow (lib/questions.ts), and the
// LLM system prompts (lib/prompt.ts). Update numbers HERE, not in prose.

export const KB = {
  version: "1.1",
  spamassassinThreshold: 5.0,
  targetSpamScore: 2.0,

  authentication: {
    spf: {
      lookupLimit: 10,
      results: {
        PASS: { saScore: -0.001 },
        SOFTFAIL: { saScore: 0.972, rule: "SPF_SOFTFAIL", note: "testing only" },
        FAIL: { saScore: 2.6, rule: "SPF_FAIL", note: "fix immediately" },
        NEUTRAL: { saScore: 0.652, rule: "SPF_NEUTRAL", note: "avoid long-term" },
        PERMERROR: { note: ">10 DNS lookups; treated as FAIL — flatten record" },
      },
      mechanisms: {
        "+all": "DANGEROUS — authorises all servers",
        "~all": "softfail — testing only",
        "-all": "fail — production recommended",
        "?all": "neutral — no assertion",
      },
    },
    dkim: {
      dnsLocation: "selector._domainkey.yourdomain.com",
      recommendedKeyBits: 2048,
      minimumKeyBits: 1024,
      rotationMonths: [6, 12] as const,
      saScores: { DKIM_VALID_AU: -0.1, DKIM_INVALID: 2.0 },
    },
    dmarc: {
      requiredBy: ["Google Feb 2024", "Yahoo Feb 2024"],
      policies: {
        none: { saScore: 0.898, use: "monitoring, new domains" },
        quarantine: { saScore: 1.198, use: "intermediate enforcement" },
        reject: { saScore: 1.797, use: "full enforcement; required for BIMI" },
      },
      // Google Workspace edge case: DMARC can read FAIL while mail still delivers
      // (SPF may pass independently + Google heuristics). Not a reliable state —
      // fix alignment — but do NOT raise a crisis-level alarm if mail is landing.
      gworkspaceFailButLands: true,
    },
  },

  reputation: {
    // Ordered strongest-positive → most-negative.
    engagementHierarchy: [
      { signal: "reply", weight: "highest positive", note: "implies a real, wanted conversation" },
      { signal: "open", weight: "moderate positive", note: "Apple MPP (iOS15+) causes false opens" },
      { signal: "click", weight: "moderate positive", note: "tracking domain has its own reputation" },
      { signal: "ignore", weight: "slow negative", note: "sunset after 60–90 days" },
      { signal: "unsubscribe", weight: "minor negative", note: "better than a spam complaint" },
      { signal: "spam_complaint", weight: "heavy negative", note: "0.10% threshold" },
    ],
    complaintThresholds: {
      googleTarget: 0.08,   // %
      googleWarning: 0.1,   // %
      enforcement: 0.3,     // % Google + Yahoo
    },
    unsubscribeThresholds: {
      good: 0.2,            // % — healthy, expected churn
      concern: 0.5,         // % — rising, investigate list/content fit
      critical: 0.5,        // % — high, strong signal of relevance mismatch
      note: "Unsubscribes mean emails are landing and being read. This is a list relevance or content problem, not an inbox placement problem.",
    },
    // IP / domain warming schedule — daily volume by age, with gating metrics.
    ipWarming: [
      { range: "Days 1–3", daily: "50–200", requirement: "most-engaged segment only" },
      { range: "Days 4–7", daily: "200–500", requirement: "open rate >20%, complaint <0.1%" },
      { range: "Week 2", daily: "500–2,000", requirement: "keep monitoring metrics" },
      { range: "Week 3", daily: "2,000–10,000", requirement: "expand to warm segments" },
      { range: "Week 4–6", daily: "10,000–50,000", requirement: "full list if metrics healthy" },
      { range: "Week 6–8", daily: "50,000–100,000+", requirement: "full volume" },
    ],
    warmingRules: [
      "Double volume every 2–3 days only if open rate stays above 20%",
      "Stop and hold if open rate drops below 20%",
      "Never send more than 25% over the historical max on a new day",
      "Start with most-engaged contacts only — replies and recent openers",
    ],
  },

  content: {
    spamassassinThreshold: 5.0,
    targetSpamScore: 2.0,
    // Highest-impact real SpamAssassin scores (50_scores.cf).
    highRiskRules: [
      { rule: "DRUGS_SMEAR1", score: 3.3 },
      { rule: "DEAR_WINNER", score: 3.099 },
      { rule: "FUZZY_PHARMACY", score: 2.96 },
      { rule: "DRUG_ED_CAPS", score: 2.799 },
      { rule: "FUZZY_PHENT", score: 2.799 },
      { rule: "DEAR_FRIEND", score: 2.683 },
      { rule: "DRUGS_DIET", score: 2.66 },
      { rule: "BANKING_LAWS", score: 2.399 },
      { rule: "EXCUSE_4", score: 2.399, trigger: '"To Be Removed, Please"' },
      { rule: "FUZZY_PRICES", score: 2.311 },
      { rule: "MISSING_SUBJECT", score: 2.195 },
      { rule: "BODY_ENHANCEMENT", score: 1.611 },
      { rule: "FUZZY_CREDIT", score: 1.678 },
      { rule: "BILLION_DOLLARS", score: 1.451 },
      { rule: "BANG_GUAR", score: 1.0, trigger: '"guarantee!" variants' },
    ],
    htmlRules: [
      "HTML_IMAGE_ONLY_xx — image with little text; score rises as text drops",
      "HTML_IMAGE_RATIO_xx — text-to-image ratio under ~0.8%",
      "HTML_FONT_LOW_CONTRAST — font colour ≈ background (hidden text)",
      "HTML_OBFUSCATE_xx — 5–100% obfuscation",
      "HTML_TAG_BALANCE / HTML_BADTAG — malformed markup",
    ],
    subjectRules: [
      "SUBJ_ALL_CAPS",
      "PLING_QUERY (! and ?)",
      "MISSING_SUBJECT (+2.195)",
      "SUBJ_DOLLARS",
      "GAPPY_SUBJECT",
    ],
    fromRules: [
      "FROM_BLANK_NAME",
      "FROM_STARTS_WITH_NUMS",
      "FROM_NO_USER",
      "FROM_DOMAIN_NOVOWEL",
    ],
    sendingPatterns: {
      plainText1to1: "Classified personal/transactional — lowest spam scores; best for cold outreach and reputation rebuilding",
      drip1PerMinute: "Mimics a human mail client; ESPs classify as non-marketing; best cadence for inbox placement",
      htmlNewsletter: "Classified bulk/marketing; needs higher reputation and headroom to stay in inbox",
    },
    // Click and open tracking rules by domain state.
    trackingRules: {
      newDomain: "Turn tracking OFF. Domain age <4 weeks means zero reputation buffer. The marginal data insight is not worth the deliverability cost.",
      lowReputation: "Turn tracking OFF. Low open rate or reputation below Medium on Google Postmaster means no surplus to spend on tracking overhead.",
      healthyDomain: "Tracking is acceptable. Monitor the tracking domain's own reputation — it affects deliverability independently.",
      note: "Click tracking rewrites every link through a tracking subdomain. That subdomain has its own reputation. On a new or damaged domain, this adds cost you cannot afford.",
    },
  },

  infrastructure: {
    hedging: {
      definition:
        "Spend surplus sending capacity and reputation to absorb the deliverability cost of richer content (images, HTML, links, urgency words).",
      formula:
        "If capacity = 100k/day at 40% open rate and you send only 20k/day, you have 80k/day of headroom — that surplus lets you add images, links, and HTML while holding open rates.",
      rules: [
        "Build capacity FIRST, add content risk SECOND",
        "Never approach the capacity limit while experimenting with richer content",
        "Capacity = the daily volume sustainable without a deliverability drop; built over months of clean sending",
        "No headroom = strip to plain text, single link, no tracking until rebuilt",
      ],
    },
    bounceThresholds: {
      good: "<0.5%",
      acceptable: "0.5–2%",
      concern: ">2% (validate list before next send)",
      critical: ">5% (stop bulk sending; full audit required)",
      emergency: ">10% (ESP may suspend account)",
    },
    bounceHandling: [
      "5xx hard bounce → remove immediately, never retry",
      "4xx soft bounce → retry up to 72h",
      "3+ consecutive soft bounces → treat as hard bounce, remove",
      "Never resend to hard-bounced addresses — this is a critical hygiene failure",
    ],
    // Bounce type diagnostic signal.
    bounceTypeDiagnosis: {
      mostlyHard: "List quality problem — bad addresses, old or unverified list. Run verification before next send.",
      mostlySoft: "Reputation or volume problem — receiving servers are throttling or deferring. Reduce volume and check complaint rate.",
      mixed: "Both list quality and reputation issues present. Address list hygiene first, then volume.",
    },
    subdomainIsolation: {
      recommendation: "Send bulk email from a subdomain (e.g. mail.yourdomain.com, send.yourdomain.com) not from the root domain.",
      reason: "Bulk sending reputation is isolated to the subdomain. A reputation event on the subdomain does not damage the root domain, your website deliverability, or your transactional email.",
      threshold: "Recommended for any sender doing >500 emails/day or running marketing campaigns.",
      rootDomainRisk: "Sending bulk from the root domain means any spam filter event, blacklisting, or reputation drop affects your entire domain including transactional mail.",
    },
    smtpPorts: {
      "587": "STARTTLS (recommended)",
      "465": "implicit TLS (recommended)",
      "25": "MTA relay only",
    },
  },

  listHygiene: {
    engagementSegments: {
      active: "0–30 days — send freely",
      warm: "31–90 days — send with normal cadence",
      cold: "91–180 days — exclude from new campaigns; run re-engagement sequence",
      lapsed: ">180 days — 2–3 email re-engagement attempt, then suppress if no response",
      suppressed: "Never send again — keep in suppression list to prevent re-import",
    },
    resendRules: {
      nonOpeners: {
        risk: "Each non-open is a weak negative engagement signal. Resending multiplies it.",
        rule: "Only retry once, with a different subject line, and only to contacts who have opened at least once before.",
        neverResend: "Do not resend to chronic non-openers — they are net negative to your reputation.",
      },
      bouncedAddresses: {
        risk: "Resending to hard-bounced addresses is a critical hygiene failure and a strong reputation damage signal.",
        rule: "Hard bounces must be permanently suppressed immediately. Never retry. Never re-import.",
        espNote: "Most ESPs suppress hard bounces automatically — verify this is enabled in your account settings.",
      },
    },
    sendingFrequency: {
      restartAfterGap: {
        risk: "A long sending gap means list has gone cold and domain reputation has partially decayed.",
        rule: "Treat a restart like a new domain warmup. Start low with most recently engaged contacts. Do not blast the full list on first send back.",
        timeline: "Re-warm over 2–4 weeks before returning to previous send volume.",
      },
      tooFrequent: {
        risk: "Sudden increases in sending frequency drive up complaint and unsubscribe rates.",
        rule: "Increase frequency gradually. Monitor complaint rate after each frequency change.",
      },
    },
    spamTraps: {
      pristine: { cause: "bought/scraped list", risk: "immediate blacklist" },
      recycled: { cause: "old list, no sunset policy", risk: "reputation damage" },
      typo: { cause: "no validation at signup", risk: "minor" },
    },
    roleAddressesToAvoid: [
      "info@", "admin@", "sales@", "webmaster@", "postmaster@", "noc@",
      "abuse@", "hostmaster@", "support@", "contact@", "help@", "billing@",
    ],
  },

  // Drop pattern diagnosis — how the pattern of decline points to the cause.
  dropPatternDiagnosis: {
    sudden: {
      description: "Open rate or deliverability dropped overnight or within a few days.",
      likelyCauses: [
        "Sending IP flagged or blacklisted",
        "Domain blacklisted by a major provider",
        "Sending volume spiked and triggered rate limiting",
        "Sending IP changed (ESP migration, new dedicated IP with no warmup)",
      ],
      firstAction: "Check domain and IP against blacklists immediately via MXToolbox. If not blacklisted, check if the sending IP changed.",
      recovery: "Identify and fix the trigger event. Request delisting only after the cause is resolved.",
    },
    gradual: {
      description: "Open rate declined slowly over weeks or months.",
      likelyCauses: [
        "Unengaged contacts accumulating in the list",
        "Complaint rate slowly crossing thresholds",
        "Sending frequency increasing over time",
        "Content quality drifting toward spam patterns",
      ],
      firstAction: "Suppress unengaged contacts (no opens in 90 days). Strip content risk. Send to engaged only.",
      recovery: "4–6 weeks of clean sending to meaningful recovery. Not an overnight fix.",
    },
    alwaysLow: {
      description: "Deliverability was never good — not a recent change.",
      likelyCauses: [
        "Authentication not set up correctly from the start",
        "Domain reputation never established",
        "List quality was poor from day one",
        "Sending volume was too high from the start with no warmup",
      ],
      firstAction: "Start from the foundation: verify auth, check list quality, confirm warmup was done.",
    },
    deadDomain: {
      description: "Open rate at 1–2% with no recovery despite fixes.",
      action: "Stop bulk sending on this domain. Spin up a new domain for active sending. Put the current domain into slow recovery — low volume, engaged contacts only, plain text only.",
      recoveryTimeline: "Domain recovery takes weeks to months and is not guaranteed. A new domain is often faster.",
    },
  },

  diagnosticPriority: [
    "1. Authentication (SPF/DKIM/DMARC) — fix first; broken auth undermines everything",
    "2. Blacklist — if listed, resolve before any other action",
    "3. Sending volume vs. domain capacity — too much too fast destroys reputation",
    "4. List quality — bounces, unsubscribes, unengaged contacts (90+ days)",
    "5. Content — images, links, spam words, tracking, HTML complexity",
    "6. Copy and relevance — subject lines, offer, audience match (outside deliverability scope)",
    "7. Domain/IP reputation dead — conclude only after eliminating 1–6",
  ],

  healthyRanges: {
    coldOpenRate: { good: ">40%", concern: "15–40%", critical: "<15%" },
    newsletterOpenRate: { good: ">25%", concern: "10–25%", critical: "<10%" },
    ctr: { good: ">3%", concern: "1–3%", critical: "<1%" },
    hardBounce: { good: "<0.5%", concern: "0.5–2%", critical: ">2%" },
    complaint: { good: "<0.08%", concern: "0.08–0.10%", critical: ">0.10%" },
    unsubscribe: { good: "<0.2%", concern: "0.2–0.5%", critical: ">0.5%" },
  },

  ghl: {
    sendingServices: {
      leadConnector: {
        description: "GHL's native sending service. Uses a shared IP pool managed by GHL/Mailgun.",
        risk: "Shared pool means your reputation is affected by other GHL users on the same IPs. Pool quality varies.",
        recommendation: "Set up a dedicated sending domain at both agency and subaccount level to isolate reputation as much as possible within Lead Connector.",
      },
      googleWorkspace: {
        description: "Sending via Google Workspace connected to GHL.",
        risk: "Google Workspace has strict sending limits. Exceeding them triggers blocks. DMARC alignment quirks apply — DMARC can read FAIL while mail still delivers.",
        recommendation: "Stay within Google's sending limits. Monitor via Google Postmaster Tools.",
      },
      outlook: {
        description: "Sending via Microsoft 365 connected to GHL.",
        risk: "Microsoft has aggressive spam filtering. Outlook users are more likely to mark emails as junk.",
        recommendation: "Ensure SPF and DKIM are correctly configured for the Microsoft 365 domain.",
      },
    },
    domainSetup: {
      agencyLevel: "Agency level sending domain isolates the agency's sending reputation from GHL's default shared domain.",
      subaccountLevel: "Subaccount level sending domain isolates each client's reputation from other subaccounts and from the agency domain.",
      missingDomain: "Without a dedicated sending domain at subaccount level, all email sends on that subaccount share GHL's default domain — a heavily shared pool with degraded reputation from thousands of other users.",
    },
    automationRisk: {
      longSequences: "Long nurture sequences accumulate unengaged contacts over time. Contacts who stopped engaging months ago remain in the sequence, generating ignore signals on every send.",
      sendingTime: "GHL automations trigger based on workflow logic by default, not optimal sending windows. Emails sent at 2am or 3am have near-zero open rates and drag down domain engagement signals.",
      openRateAmbiguity: "GHL's overall open rate averages campaigns and automations together. Always check campaign open rate and automation open rate separately before diagnosing.",
    },
    listValidation: {
      builtIn: "GHL's built-in validation checks basic syntax and MX records but does not perform risky-address or spam-trap detection.",
      thirdParty: "Third-party validation (ZeroBounce, NeverBounce, Kickbox) performs deeper checks including spam-trap detection, role address filtering, and catch-all identification.",
      recommendation: "For any list over 500 contacts or any imported list, use third-party validation before sending.",
    },
  },

  tools: {
    free: ["mail-tester.com", "MXToolbox SuperTool", "Google Postmaster Tools", "Microsoft SNDS", "learndmarc.com"],
    paid: ["GlockApps", "Litmus", "EmailOnAcid"],
    validation: ["ZeroBounce", "NeverBounce", "BriteVerify", "Kickbox"],
  },
} as const;

// Compact, token-efficient serialization of the KB for injection into the LLM
// system prompts. Stable string → caches well across requests.
export const KB_TEXT = JSON.stringify(KB);