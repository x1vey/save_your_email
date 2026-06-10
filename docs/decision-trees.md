# MailCheck — Diagnostic Decision Trees & Knowledge Model

This is the reasoning model the diagnostic follows. It encodes the deliverability
philosophy into a strict **priority order**, because the single most important
principle from the knowledge base is: *some problems must be fixed before others
even matter.*

The order is non-negotiable:

```
Tier 0  FOUNDATION (authentication)      — binary, fix FIRST, blocks everything
Tier 1  PRACTICES / HYGIENE              — fixable immediately, behavioral
Tier 2  CAPACITY (reputation + volume)   — BUILT over time, not instantly fixable
Tier 3  HEDGING                          — optimization layer, only once 0–2 are healthy
```

A low score in Tier 2 cannot be "fixed" this week — it's built. A broken item in
Tier 0 makes everything else irrelevant. The diagnostic must always communicate
*which tier* a problem lives in, because that sets the user's expectation for the
fix (a DNS edit vs. a 6-week reputation rebuild).

---

## Tier 0 — Foundation (Authentication). Gate. Fix first.

> "Anything faulty with the setup needs to be fixed first... if the setup is not
> intact it will hurt no matter what."

Target state: in Gmail → **Show original**, SPF, DKIM, and DMARC all read **PASS**.

```
SPF present and passing?
  NO  → CRITICAL. Publish SPF. (Blocks delivery, enables spoofing.)
  YES → ok

DKIM present and passing?
  NO  → CRITICAL. Enable DKIM signing at the provider, publish the public key.
  YES → ok

DMARC present?
  NO  → CRITICAL. Publish DMARC (start at p=none for monitoring).
  YES, but "Show original" shows DMARC = FAIL:
        IF provider == Google Workspace AND mail is still landing:
            → NOTE (NOT critical). Known Google Workspace alignment quirk —
              DMARC can read FAIL while mail still delivers. Monitor via rua
              reports; do not raise alarm or recommend drastic changes.
        ELSE:
            → HIGH. Fix DMARC alignment (align the From domain with SPF/DKIM).

If ANY Tier 0 item is broken:
  → It leads the report. Message: "Fix these first. Until authentication passes,
    no amount of good sending practice will save deliverability."
```

**Edge case rule (important):** a DMARC FAIL is *not automatically fatal*. Weight
the real-world signal (is mail landing?) over the raw record, especially on Google
Workspace. Don't over-alarm.

---

## Tier 1 — Practices / Hygiene. Fixable immediately.

> "Anything related to practices should be fixed as well... following the best
> practices like not sending repeated email to bounced contacts, cleaning the
> email list, validating contacts."

```
Sending to addresses that have bounced?
  YES → CRITICAL hygiene. Suppress all hard bounces immediately. Repeatedly
        hitting dead addresses is a strong negative reputation signal.

List validated / cleaned before sending?
  NO  → HIGH. Validate (syntax + MX + risky-address) and remove invalids before
        the next send. Especially for cold / imported / purchased lists.

Spam-trigger words present? (e.g. "free", "now", urgency/all-caps — see word policy)
  YES → MEDIUM. Remove or rephrase.
        EXCEPTION: if Tier-3 hedging budget is high, a limited number may be
        tolerated (see Hedging).

Tracking / open-pixel / images enabled?
  (Click + open tracking is injected as an image pixel; this is what triggers the
   "Be careful, this email has images" warning.)
     Domain is NEW or LOW reputation → HIGH. Turn tracking OFF and strip images.
            The marginal open-rate insight is not worth the deliverability hit on a
            domain with no reputation buffer.
     Domain is MATURE / HIGH reputation → allowed (and a hedging candidate).

Sending fashion:
  Bulk / one-to-many blast?
     → Recommend 1:1 sending (one unique sender → one unique recipient). ESPs
       categorize 1:1 mail as *communication*, which lands in the primary inbox.
  Cadence?
     → Recommend a drip of ~1 email per minute. Steady, human-paced sending reads
       as non-marketing / non-spam and clears filters more easily than bursts.
```

---

## Tier 2 — Capacity (Reputation + Sending Volume). Built over time.

> "Things like domain reputation and sender capacity are capacity based, so they
> can be built. If they are the cause of low deliverability then they need to be
> fixed over time."

These cannot be fixed instantly. The diagnostic sets a *timeline* expectation
(weeks), not a checkbox.

### 2a. Sender / Domain Reputation

Reputation is the running tally of how recipients react. Signal hierarchy:

```
POSITIVE (strongest → weakest):
   Reply           ▲ highest positive weight
   Read / Open
   Link click      ▼

NEGATIVE (most → least severe):
   Marked as spam  ▲ most severe
   Ignored over time (no engagement) — erodes reputation slowly into spam
```

```
Reputation low (lots of ignores and/or spam-marks)?
  → REBUILD plan (over weeks):
      - Email only the most engaged / most likely-to-reply recipients first.
      - Optimize for replies and opens; pause anything that only chases clicks.
      - Strip risk elements (images, links, spam words) while rebuilding.
      - Sunset chronically disengaged contacts (they generate the "ignored" signal).
```

### 2b. Sender Capacity

Every domain has its own daily capacity — the number of emails it can send per day
*without* deliverability dropping. It is unique per domain and grows as reputation
and age grow.

```
Daily volume > the domain's safe capacity?
  → THROTTLE to within capacity, then warm up: ramp volume gradually over weeks.
    Exceeding capacity is read as spammy bursting and lowers deliverability for
    everything.

New domain?
  → Start low and ramp. No reputation history = low initial capacity.
```

> ⚠️ **Calibratable:** the actual capacity numbers and ramp schedule per domain
> age are proprietary and must be supplied (see "Open calibration inputs").

---

## Tier 3 — Hedging (proprietary optimization layer)

> "Hedging... using some good forces and bad forces, compromising to create an
> ideal situation."

Hedging is only meaningful **once Tier 0 is clean and Tier 1–2 are healthy.** It is
the deliberate trade: spend surplus headroom to afford otherwise-harmful elements.

Mental model:

```
Deliverability outcome ≈ (GOOD forces) − (BAD forces)

GOOD forces (headroom you can spend):
   - large unused capacity (sending well under the daily cap)
   - strong reputation / high open rate
   - clean validated list, 1:1 drip cadence, auth all PASS

BAD forces (things you might *want* to include despite the cost):
   - images / HTML
   - links, link shorteners
   - tracking pixels
   - spam-trigger words
```

Worked example from the knowledge base:

```
Capacity = 100,000/day, healthy at 40% open rate, but only sending 20,000/day.
→ Large surplus headroom (sending at 20% of capacity).
→ Hedging budget is HIGH: you can add images, links, richer HTML and STILL hold
  40%+ open rates, because the good forces dominate.
```

Decision:

```
Compute hedging headroom from (capacity surplus) and (reputation / open-rate surplus).

Headroom HIGH:
  → Permit "expensive" elements the user needs (images, links, HTML, a few
    necessary spam-ish words). The good forces absorb the cost.

Headroom LOW or NEGATIVE:
  → Strip everything non-essential. Pure-text, 1:1, no tracking, no risk words.
    There is no budget to spend.
```

> ⚠️ **Calibratable:** the exact formula converting surplus into a usable "risk
> budget" is proprietary (see "Open calibration inputs").

---

## How a full diagnosis flows

```
1. Run Tier 0. If anything broken → it leads; everything else is secondary.
2. Run Tier 1. List immediate behavioral fixes.
3. Run Tier 2. Flag capacity/reputation issues as BUILD-OVER-TIME, set a timeline.
4. Run Tier 3. Only if 0–2 are healthy, advise where the user can spend headroom
   (or warn that they have none).
5. Always state the tier of each problem so the user knows fix-now vs. build-over-time.
```

---

## Question policy — how the tree drives the AI interview

The decision tree doesn't only score; it drives the *intake*. The interview is
**AI-led but tree-grounded**:

- **The tree owns the slots.** `lib/questions.ts` defines a fixed registry of
  question "slots" — each with a stable `id`, an `intent` (the decision it informs),
  a `tier`, a `type`, and canonical option `value`s.
- **The AI owns the sequencing.** `lib/interview.ts` + `app/api/interview` hand the
  LLM: what the DNS scan already established (`KNOWN_FROM_SCAN`), the slot registry,
  and everything answered so far. The model picks the single highest-value next
  slot, skips irrelevant ones, **re-phrases** the question for this sender
  (provider/role/volume), and decides when to stop.
- **Integrity is preserved.** The model may only return a slot `id` that exists and
  hasn't been asked; the server re-attaches the canonical `type`/`options`, so the
  answer keys/values stay fixed and `behavioralFindings` keeps mapping them. If the
  model returns junk or there's no API key, it falls back to walking the static tree
  in order (`fallbackTurn`).

What is machine-known vs. must-ask:

| Layer | Source | Examples |
|-------|--------|----------|
| Authentication, MX, ESP | **DNS scan** (never asked) | SPF/DKIM/DMARC pass, provider |
| Sending behavior | **Interview** | role, volume, warmup, IP type |
| List provenance & hygiene | **Interview** | opt-in source, bounce handling, validation |
| Compliance | **Interview** (+ DNS hints) | unsubscribe, From identity |
| Reputation signals | **Interview** | complaint rate, open rate, segmentation |
| Content risk | **Interview** + **linter** | image/link/spam-word habits; or paste a draft |

The interviewer is capped at `MAX_QUESTIONS` (8) so the intake stays short.

## Calibration inputs — NOW SUPPLIED ✅

These were previously placeholders. They are now quantified in `lib/kb.ts` (the
machine-usable core) and `docs/knowledge-base.html` (the human reference), and are
injected into the LLM system prompt via `lib/prompt.ts`:

1. **Sender-capacity ramp** → `KB.reputation.ipWarming` (50–200/day at days 1–3,
   doubling every 2–3 days, up to 100k+/day by weeks 6–8; hold if open rate <20%).
2. **Reputation weights** → `KB.reputation.engagementHierarchy`
   (reply > open > click > ignore > unsubscribe > spam-complaint).
3. **Low-reputation / tracking-off threshold** → domain <30 days OR reputation below
   Medium (Google Postmaster) → disable tracking pixels & images.
4. **Spam-word / content policy** → `KB.content.highRiskRules` (real SpamAssassin
   scores) plus HTML / subject / From rule families; threshold 5.0, target <2.0.
5. **Hedging formula** → `KB.infrastructure.hedging` (surplus = capacity − volume at
   a healthy open rate; spend it on richer content; build capacity first).
6. **Healthy benchmarks** → `KB.healthyRanges` (cold open >40%, complaint <0.08%,
   hard bounce <0.5%, etc.) and `KB.reputation.complaintThresholds`.
```
