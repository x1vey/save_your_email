import type { Question } from "./types";
import type { Answers, ScanResult } from "./types";

export const QUESTIONS: Question[] = [
  {
    id: "role",
    text: "What best describes your sending?",
    type: "single",
    intent:
      "Sets the whole frame: cold vs. opt-in vs. transactional changes which rules apply and which benchmarks are relevant.",
    tier: 2,
    options: [
      { value: "cold", label: "Cold outreach / prospecting" },
      { value: "marketing", label: "Marketing to opted-in subscribers" },
      { value: "transactional", label: "Transactional (receipts, resets, notifications)" },
      { value: "mixed", label: "A mix of the above" },
    ],
  },
  {
    id: "volume",
    text: "Roughly how many emails do you send per day?",
    type: "single",
    intent:
      "Volume vs. capacity. Drives warmup need and whether bursting is the problem. High volume on a new or low-rep domain is a critical cause.",
    tier: 5,
    options: [
      { value: "lt50", label: "Under 50" },
      { value: "50-500", label: "50 – 500" },
      { value: "500-5k", label: "500 – 5,000" },
      { value: "5k+", label: "Over 5,000" },
    ],
  },
  {
    id: "domain_age",
    text: "How long has this sending domain been actively sending email?",
    help: "Brand-new domains have no reputation and must be warmed up slowly.",
    type: "single",
    intent:
      "Reputation maturity. New domains (<4 weeks) are high-risk and need warming regardless of volume. Domain age combined with volume tells us if capacity is being exceeded.",
    tier: 5,
    options: [
      { value: "new", label: "Less than 4 weeks" },
      { value: "1-6mo", label: "1 – 6 months" },
      { value: "mature", label: "Over 6 months" },
    ],
  },
  {
    id: "ip_type",
    text: "Are you sending on a shared IP (typical ESP) or a dedicated IP?",
    help: "A cold dedicated IP performs WORSE than a warm shared one below ~10k/month.",
    type: "single",
    intent:
      "Shared vs. dedicated IP. Dedicated + new or <10k/month is a misconfiguration that actively hurts deliverability.",
    tier: 5,
    options: [
      { value: "shared", label: "Shared IP (Mailgun/SendGrid/Postmark/etc.)" },
      { value: "dedicated", label: "Dedicated IP" },
      { value: "unsure", label: "Not sure" },
    ],
    showIf: ({ answers }) =>
      answers.volume === "500-5k" || answers.volume === "5k+",
  },
  {
    id: "warmup",
    text: "Did you warm up this domain/IP by ramping volume gradually?",
    help: "Going from 0 to thousands of emails overnight is the #1 way to get throttled.",
    type: "single",
    intent:
      "Warmup compliance. No-warmup on new/high-volume is a critical reputation cause. Must ask if domain is new or volume is high.",
    tier: 5,
    options: [
      { value: "yes", label: "Yes, ramped gradually" },
      { value: "no", label: "No, started at full volume" },
      { value: "unsure", label: "Not sure" },
    ],
    showIf: ({ answers }) =>
      answers.domain_age === "new" ||
      answers.volume === "5k+" ||
      answers.volume === "500-5k",
  },
  {
    id: "list_source",
    text: "Where does your recipient list come from?",
    type: "multi",
    intent:
      "Opt-in provenance. Purchased/scraped = spam-trap risk and must-stop. Imported = needs verification. Double opt-in = cleanest.",
    tier: 4,
    options: [
      { value: "optin", label: "Explicit opt-in (signup form, checkout)" },
      { value: "doubleoptin", label: "Double opt-in (confirmed)" },
      { value: "purchased", label: "Purchased or scraped list" },
      { value: "imported", label: "Imported from an old system / CRM" },
    ],
  },
  {
    id: "list_hygiene",
    text: "How do you handle bounces and inactive contacts?",
    type: "single",
    intent:
      "Bounce suppression + sunsetting. Mailing dead addresses and unengaged contacts erodes reputation. Critical for diagnosing list-driven problems.",
    tier: 4,
    options: [
      { value: "auto", label: "Automatically suppress hard bounces & long-inactive" },
      { value: "manual", label: "Clean the list manually now and then" },
      { value: "none", label: "We don't remove anyone" },
    ],
  },
  {
    id: "verify",
    text: "Do you verify new email addresses before sending (syntax + MX + risky-address check)?",
    type: "single",
    intent:
      "Validation. Unverified cold/imported lists carry invalids and traps. Key signal for list-quality diagnosis.",
    tier: 4,
    options: [
      { value: "yes", label: "Yes, every address" },
      { value: "signup", label: "Only confirmation at signup" },
      { value: "no", label: "No verification" },
    ],
    showIf: ({ answers }) =>
      answers.role === "cold" ||
      (Array.isArray(answers.list_source) &&
        (answers.list_source.includes("purchased") ||
          answers.list_source.includes("imported"))),
  },
  {
    id: "unsub",
    text: "Do your bulk emails include a working unsubscribe link AND one-click (List-Unsubscribe) header?",
    help: "Gmail/Yahoo now require one-click List-Unsubscribe for bulk senders.",
    type: "single",
    intent:
      "RFC 8058 compliance. Missing one-click unsub causes blocks and complaints. Also a signal for whether high unsubscribes are a compliance issue vs. a relevance issue.",
    tier: 4,
    options: [
      { value: "both", label: "Yes — visible link and one-click header" },
      { value: "link", label: "Visible link only" },
      { value: "none", label: "No unsubscribe / not sure" },
    ],
    showIf: ({ answers }) => answers.role !== "transactional",
  },
  {
    id: "from_identity",
    text: "Does your 'From' address use your real sending domain (not a free mailbox like gmail.com)?",
    type: "single",
    intent:
      "DMARC alignment. Sending bulk from gmail.com fails alignment and is rejected.",
    tier: 1,
    options: [
      { value: "domain", label: "Yes, our own domain" },
      { value: "free", label: "We send from a free address (gmail/outlook)" },
    ],
  },
  {
    id: "complaints",
    text: "Do you know your spam-complaint rate, and is it under 0.3%?",
    help: "Google targets <0.08%, warns at 0.10%, and enforces at 0.30%.",
    type: "single",
    intent:
      "Complaint rate vs. the 0.10%/0.30% thresholds. Heavy negative reputation signal. Critical for diagnosing reputation erosion.",
    tier: 5,
    options: [
      { value: "under", label: "Yes, under 0.1%" },
      { value: "mid", label: "Between 0.1% and 0.3%" },
      { value: "over", label: "Over 0.3%" },
      { value: "unknown", label: "I don't track it" },
    ],
    showIf: ({ answers }) => answers.role !== "transactional",
  },
  {
    id: "open_rate",
    text: "What's your typical open rate?",
    help: "Marketing/newsletter: >25% good, 10–25% concern, <10% critical. Cold outreach: >40% good, 15–40% concern, <15% likely spam-foldered.",
    type: "single",
    intent:
      "Open rate vs. healthy benchmarks. Low opens signal reputation/placement trouble. Rate of change (sudden vs gradual) matters as much as the number itself.",
    tier: 5,
    options: [
      { value: "high", label: "Over 40%" },
      { value: "mid", label: "15 – 40%" },
      { value: "low", label: "Under 15%" },
      { value: "unknown", label: "I don't track it" },
    ],
  },
  {
    id: "content",
    text: "Which of these describe your typical email content?",
    type: "multi",
    intent:
      "Content risk factors. Images, links, and spam words cost deliverability credit. Only worth spending if the sender has surplus reputation.",
    tier: 3,
    options: [
      { value: "balanced", label: "Mostly text with a few links" },
      { value: "imageheavy", label: "Big single image / image-only" },
      { value: "manylinks", label: "Many links or link shorteners (bit.ly etc.)" },
      { value: "spamwords", label: 'Urgency/spam-trigger words ("FREE!!!", "ACT NOW")' },
      { value: "attachments", label: "Attachments" },
    ],
  },
  {
    id: "seg",
    text: "Do you segment and only email engaged recipients (e.g. opened in last 90 days)?",
    type: "single",
    intent:
      "Engagement segmentation. Blasting disengaged contacts depresses signals and erodes reputation. Key for diagnosing gradual decline.",
    tier: 5,
    options: [
      { value: "yes", label: "Yes, we sunset disengaged contacts" },
      { value: "no", label: "No, we email the whole list" },
    ],
    showIf: ({ answers }) =>
      answers.role === "marketing" || answers.role === "mixed",
  },

  // ── NEW SLOTS ──────────────────────────────────────────────────────────────

  {
    id: "drop_pattern",
    text: "Did your open rate or deliverability drop suddenly or gradually over time?",
    help: "A sudden drop points to a very different cause than a slow decline.",
    type: "single",
    intent:
      "Sudden vs. gradual drop is one of the most critical triage signals. Sudden = IP or domain flagged/blacklisted. Gradual = reputation erosion from list or content quality. Changes the entire diagnosis path.",
    tier: 5,
    options: [
      { value: "sudden", label: "Suddenly — happened overnight or within a few days" },
      { value: "gradual", label: "Gradually — declined over weeks or months" },
      { value: "always_low", label: "Always been low — never really worked well" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "click_tracking",
    text: "Do you have click tracking enabled in your emails?",
    help: "Click tracking rewrites your links through a tracking domain. On low-reputation domains this can hurt deliverability.",
    type: "single",
    intent:
      "Click tracking adds a third-party redirect domain to every link. On a new or low-reputation domain this adds deliverability cost you cannot afford. Key for diagnosing content-related delivery problems.",
    tier: 3,
    options: [
      { value: "yes", label: "Yes, click tracking is on" },
      { value: "no", label: "No, it's off" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "image_count",
    text: "How many images do you typically include in a single email?",
    type: "single",
    intent:
      "Image count directly affects spam scoring. Image-heavy emails with little text are a classic spam signal. On low-rep domains even one image adds cost. Used to diagnose content risk vs. available credit.",
    tier: 3,
    options: [
      { value: "none", label: "No images" },
      { value: "one", label: "One image (logo or banner)" },
      { value: "few", label: "2 – 4 images" },
      { value: "many", label: "5 or more images" },
    ],
  },
  {
    id: "link_density",
    text: "How many links do you typically include in a single email?",
    type: "single",
    intent:
      "Link density is a spam signal. Many links = marketing pattern = lower inbox placement. 1–2 links on a plain text email is very different from 8 links in an HTML newsletter. Used to evaluate content credit spend.",
    tier: 3,
    options: [
      { value: "none", label: "No links" },
      { value: "one", label: "One link (single CTA)" },
      { value: "few", label: "2 – 4 links" },
      { value: "many", label: "5 or more links" },
    ],
  },
  {
    id: "bounce_type",
    text: "When you get bounces, what kind are they mostly?",
    help: "Hard bounces (permanent) are more damaging than soft bounces (temporary).",
    type: "single",
    intent:
      "Bounce type changes the diagnosis. Mostly hard bounces = list quality problem. Mostly soft bounces = reputation or sending volume problem (being throttled). Mix = both.",
    tier: 4,
    options: [
      { value: "hard", label: "Mostly hard bounces (permanent failures)" },
      { value: "soft", label: "Mostly soft bounces (temporary / deferred)" },
      { value: "mix", label: "A mix of both" },
      { value: "unknown", label: "I don't track bounces" },
    ],
  },
  {
    id: "resend_unopened",
    text: "Do you resend emails to contacts who didn't open the first send?",
    type: "single",
    intent:
      "Resending to non-openers compounds deliverability damage. Each non-open is a negative signal. Resending multiplies it. Combined with a large unengaged list this is a primary driver of reputation erosion.",
    tier: 4,
    options: [
      { value: "yes", label: "Yes, we resend to non-openers" },
      { value: "no", label: "No, we only send once" },
      { value: "sometimes", label: "Sometimes, with a different subject line" },
    ],
  },
  {
    id: "resend_bounced",
    text: "Do you ever resend to addresses that have bounced before?",
    type: "single",
    intent:
      "Resending to bounced addresses is a critical hygiene failure. Hard bounces must be permanently suppressed. Repeatedly hitting dead addresses directly damages sender reputation.",
    tier: 4,
    options: [
      { value: "no", label: "No, bounced addresses are suppressed permanently" },
      { value: "soft_only", label: "Only soft bounces — we retry those" },
      { value: "yes", label: "Yes, we resend to all bounced addresses" },
      { value: "unsure", label: "Not sure how our system handles it" },
    ],
  },
  {
    id: "subdomain_vs_root",
    text: "Are you sending from your root domain or a subdomain?",
    help: "e.g. root domain: mail@company.com — subdomain: mail@send.company.com",
    type: "single",
    intent:
      "Subdomain isolation protects root domain reputation. Sending bulk from root domain means any reputation event affects everything — website, transactional email, brand trust.",
    tier: 2,
    options: [
      { value: "root", label: "Root domain (mail@company.com)" },
      { value: "subdomain", label: "Subdomain (mail@send.company.com)" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "sending_platform",
    text: "Which email platform or service do you use to send emails?",
    tier: 1,
    type: "single",
    intent: "Determines whether the sender is using GoHighLevel or an external ESP. This is the primary routing question — GHL users get a separate set of diagnostic questions because GHL has its own account structure, sending services, and domain setup requirements.",
    options: [
      { value: "ghl", label: "GoHighLevel (GHL)" },
      { value: "external", label: "An external ESP (Mailchimp, Klaviyo, SendGrid, ActiveCampaign, etc.)" }
    ],
  },
  {
    id: "ghl_account_type",
    text: "What best describes your GoHighLevel account level?",
    tier: 1,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "GHL has two account levels — agency and subaccount. Domain setup requirements, sending service options, and reputation isolation differ between them. This determines which GHL-specific questions apply.",
    options: [
      { value: "agency_owner", label: "I am an agency owner (I manage the GHL account)" },
      { value: "subaccount", label: "I am using a subaccount under an agency" }
    ],
  },
  {
    id: "ghl_agency_domain",
    text: "Do you have an agency-level sending domain configured in GoHighLevel?",
    tier: 1,
    type: "single",
    showIf: ({ answers }) =>
      answers.sending_platform === "ghl" && answers.ghl_account_type === "agency_owner",
    intent: "Agency level sending domain setup in GHL is required for proper authentication and reputation isolation. Missing it means all subaccounts share a default domain with poor reputation.",
    options: [
      { value: "yes", label: "Yes, agency level sending domain is configured" },
      { value: "no", label: "No, not set up" },
      { value: "unsure", label: "Not sure" }
    ],
  },
  {
    id: "ghl_subaccount_domain",
    text: "Does the subaccount have its own dedicated sending domain in GoHighLevel?",
    tier: 1,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "Subaccount level dedicated sending domain isolates each client's reputation. Without it, the subaccount sends on a shared GHL domain which has degraded reputation from other users.",
    options: [
      { value: "yes", label: "Yes, subaccount has its own sending domain" },
      { value: "no", label: "No, using the default GHL domain" },
      { value: "unsure", label: "Not sure" }
    ],
  },
  {
    id: "ghl_sending_service",
    text: "Which sending service does your GoHighLevel account use?",
    tier: 2,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "GHL supports three sending services with different reputation, warmup, and deliverability characteristics: Lead Connector (GHL native shared pool), Google Workspace, and Outlook/Microsoft 365. The diagnosis changes significantly depending on which one is in use.",
    options: [
      { value: "lead_connector", label: "Lead Connector (GHL's native sending)" },
      { value: "google_workspace", label: "Google Workspace" },
      { value: "outlook", label: "Microsoft 365 / Outlook" },
      { value: "unsure", label: "Not sure which one" }
    ],
  },
  {
    id: "ghl_list_validation",
    text: "Where do you validate or verify your email lists?",
    tier: 4,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "GHL has a built-in email validation tool but it is less thorough than dedicated third-party validation services. Knowing where validation happens tells us how clean the list is likely to be.",
    options: [
      { value: "inside_ghl", label: "Inside GHL using the built-in validation" },
      { value: "outside_ghl", label: "Outside GHL using a third-party tool (ZeroBounce, NeverBounce, etc.)" },
      { value: "both", label: "Both" },
      { value: "none", label: "We don't validate" }
    ],
  },
  {
    id: "ghl_nurture_sequence",
    text: "Are you running automated email nurture sequences in GoHighLevel?",
    tier: 3,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "Long nurture sequences in GHL accumulate unengaged contacts over time. Contacts who entered the sequence months ago and never engaged are still receiving emails, dragging down engagement signals for the whole domain.",
    options: [
      { value: "yes_long", label: "Yes, sequences of 10+ emails over weeks or months" },
      { value: "yes_short", label: "Yes, short sequences of under 10 emails" },
      { value: "no", label: "No sequences — we send one-off campaigns" },
      { value: "both", label: "Both sequences and one-off campaigns" }
    ],
  },
  {
    id: "ghl_open_rate_scope",
    text: "Is the open rate you are concerned about overall, or for a specific send?",
    tier: 5,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "In GHL the overall open rate shown in the dashboard averages across all emails including automations and campaigns. A low overall rate could be masking a healthy campaign rate being dragged down by poorly performing automations — or vice versa. This disambiguates the open rate signal.",
    options: [
      { value: "overall", label: "Overall open rate across all emails" },
      { value: "specific_campaign", label: "Specific to a campaign I am looking at" },
      { value: "automation", label: "Automation / workflow emails specifically" },
      { value: "unsure", label: "Not sure how it is calculated" }
    ],
  },
  {
    id: "ghl_automation_open_rate",
    text: "What is your typical open rate for automation/workflow emails?",
    tier: 5,
    type: "single",
    showIf: ({ answers }) =>
      answers.sending_platform === "ghl" &&
      (answers.ghl_nurture_sequence === "yes_long" || answers.ghl_nurture_sequence === "both"),
    intent: "Automation open rates in GHL are often lower than campaign open rates because sequences include contacts at all stages of engagement including very old cold contacts. A low automation open rate with a healthy campaign open rate points to sequence list hygiene, not domain reputation.",
    options: [
      { value: "high", label: "Over 30%" },
      { value: "mid", label: "15 – 30%" },
      { value: "low", label: "Under 15%" },
      { value: "unknown", label: "I don't track it separately" }
    ],
  },
  {
    id: "ghl_sending_time",
    text: "When do your GoHighLevel automated emails send?",
    tier: 3,
    type: "single",
    showIf: ({ answers }) => answers.sending_platform === "ghl",
    intent: "Sending outside of business hours (6am–8pm recipient local time) significantly reduces open rates. In GHL automations often trigger at any hour based on workflow logic rather than optimal sending windows. This is a common and easily fixable cause of low open rates.",
    options: [
      { value: "business_hours", label: "Mostly during business hours (6am – 8pm)" },
      { value: "any_time", label: "Any time — no sending window set" },
      { value: "scheduled", label: "Scheduled for a specific time window" },
      { value: "unsure", label: "Not sure — it depends on when the automation triggers" }
    ],
  },
  {
    id: "sending_frequency",
    text: "How often do you send to your list?",
    type: "single",
    intent:
      "Sending frequency combined with list engagement tells us if fatigue is a factor. Sudden increase in frequency is a common cause of complaint spikes and unsubscribe jumps. Long gap before sending = cold list problem.",
    tier: 3,
    options: [
      { value: "daily", label: "Daily or more" },
      { value: "weekly", label: "A few times a week or weekly" },
      { value: "monthly", label: "A few times a month" },
      { value: "sporadic", label: "Sporadically — no regular schedule" },
      { value: "restarting", label: "Just restarting after a long gap" },
    ],
  },
  {
    id: "unsubscribe_rate",
    text: "Do you know your unsubscribe rate, and has it changed recently?",
    type: "single",
    intent:
      "Unsubscribe rate is a list relevance and content signal, not a deliverability signal. High or rising unsubscribes means people are receiving but not wanting the email — points to list quality, content relevance, or frequency. Distinguishes deliverability problems from engagement problems.",
    tier: 5,
    options: [
      { value: "low_stable", label: "Low and stable (under 0.2%)" },
      { value: "rising", label: "It has been rising recently" },
      { value: "high", label: "High — noticeably above normal" },
      { value: "unknown", label: "I don't track it" },
    ],
    showIf: ({ answers }) => answers.role !== "transactional",
  },
];

export function visibleQuestions(answers: Answers, scan: ScanResult | null): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf({ answers, scan }));
}

export function getSlot(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

// Token-efficient slot registry for injection into the triage system prompt.
// Includes only what the LLM needs to select slots: id, intent, tier, option values.
export function getSlotRegistry(): { id: string; intent: string; tier: number; options: string[] }[] {
  return QUESTIONS.map((q) => ({
    id: q.id,
    intent: q.intent ?? "",
    tier: q.tier ?? 3,
    options: q.options?.map((o) => o.value) ?? [],
  }));
}