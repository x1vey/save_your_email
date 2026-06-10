# MailCheck — AI Email Deliverability Diagnostic

An interactive, AI-powered tool that diagnoses why a domain's email lands in spam
and hands back a prioritized, plain-English fix plan.

It works in two layers:

1. **Live introspection (no input needed but a domain).** It queries public DNS and
   parses your authentication stack:
   - **MX** — mail routing / provider detection
   - **SPF** — presence, enforcement (`-all`/`~all`), and the 10-lookup limit
   - **DMARC** — presence, policy (`none`/`quarantine`/`reject`), reporting (`rua`)
   - **DKIM** — probes common + provider-specific selectors for a published key
   It auto-detects your ESP (Google, Microsoft 365, Klaviyo, SendGrid, Mailgun,
   Shopify Email, etc.) from MX/SPF to target advice and DKIM selector probing.

2. **Adaptive interview.** A branching question tree covers what DNS *can't* see —
   sending volume, domain warmup, list source/hygiene, address verification,
   unsubscribe compliance (incl. one-click List-Unsubscribe), complaint rate, and
   content patterns. Questions appear conditionally based on prior answers and the
   scan results.

Finally it scores the domain (0–100) and an LLM writes a tailored remediation plan.
If no API key is configured it falls back to a built-in deterministic rules engine,
so the app is fully functional offline.

## Architecture

| Path | Purpose |
|------|---------|
| `lib/dns-scan.ts` | Live DNS resolution + SPF/DMARC/DKIM parsing + technical scoring |
| `lib/esp.ts` | ESP fingerprinting from MX/SPF; DKIM selector hints |
| `lib/questions.ts` | The adaptive question bank with conditional `showIf` logic |
| `lib/report.ts` | Behavioral findings, final scoring, deterministic fallback report |
| `lib/llm.ts` | Provider switch — talks to OpenAI or Groq via the OpenAI SDK |
| `lib/kb.ts` | Quantified knowledge base (SpamAssassin scores, thresholds, schedules) — single source of truth |
| `lib/prompt.ts` | LLM system prompt; encodes the decision trees + injects the KB |
| `lib/spam-lint.ts` | SpamAssassin-style content linter (subject + body → additive score) |
| `app/api/lint/route.ts` | `POST {subject, body}` → spam-score result |
| `components/LintPanel.tsx` | The "Lint an email" tab UI |
| `lib/interview.ts` | AI interviewer — picks the next question slot, tailors wording, stops |
| `app/api/interview/route.ts` | `POST {scan, answers, asked}` → next question or `{done}` |

### Security & infrastructure

| Concern | How | Files |
|---------|-----|-------|
| **CORS** | `/api/*` locked to same-origin; extra origins via `ALLOWED_ORIGINS` | `middleware.ts` |
| **Auth + RLS** | Supabase; every table has RLS so a row is only visible to `auth.uid()` | `supabase/migrations/0001_init.sql`, `lib/supabase/*` |
| **Rate limiting** | Upstash Redis sliding window, **per IP and per account**, per route | `lib/ratelimit.ts`, `lib/identity.ts` |

All three **fail safe / degrade gracefully**: with no Supabase the app runs anonymously
and skips persistence; with no Upstash rate limiting fails open; CORS needs no config.

**To activate in production:**
1. Create a Supabase project, set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply the schema: `supabase db push` (or paste `supabase/migrations/0001_init.sql` into the SQL editor).
3. Enable **Anonymous sign-ins** (Supabase → Authentication → Providers) so every visitor
   gets an account id — that's what makes per-account limits and RLS engage without a login UI.
4. Create an Upstash Redis DB, set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

Per-route limits (per 10 min, applied to both IP and account) live in `lib/ratelimit.ts`:
scan 20/40, report 15/30, interview 80/160, lint 60/120.

### The adaptive interview

The questions are **AI-led but tree-grounded**. `lib/questions.ts` defines fixed
question *slots* (stable `id`, `intent`, `tier`, canonical option `value`s). The AI
interviewer (`/api/interview`) sees what the DNS scan already established, the slot
registry, and everything answered so far, then picks the single highest-value next
slot, skips irrelevant ones, and re-phrases it for the sender — returning only a
slot `id` (the server re-attaches canonical options, so scoring stays intact). With
no API key, or if the model misbehaves, it falls back to walking the static tree.
Capped at 8 questions. See `docs/decision-trees.md` → "Question policy".
| `app/api/scan/route.ts` | `POST {domain}` → live scan result |
| `app/api/report/route.ts` | `POST {scan, answers}` → AI (or fallback) Markdown plan |
| `app/page.tsx` | The multi-step wizard UI |
| `components/Markdown.tsx` | Dependency-free Markdown renderer for the report |

The scoring model lives in the findings themselves: every issue carries a `weight`,
and the score is `100 − Σ(weights of failed/warned findings)`. Tuning a weight in one
place updates both the score and the report.

## Running it

```bash
npm install
cp .env.example .env.local   # optional — add a GROQ_API_KEY or OPENAI_API_KEY
npm run dev                  # http://localhost:3000 (use PORT=3411 if 3000 is busy)
```

The report writer supports **Groq** and **OpenAI** (both via the OpenAI-compatible
chat-completions API). Set `LLM_PROVIDER=groq|openai`, or just supply one key and it
auto-selects (Groq preferred). Defaults: Groq → `llama-3.3-70b-versatile`,
OpenAI → `gpt-4o-mini`. With no key at all, the app falls back to the built-in
deterministic rules engine and still works.

## Ideas for the next iteration

- **Email header analysis** — paste a Gmail "Show original" header and parse the
  `Authentication-Results` (real pass/fail for SPF/DKIM/DMARC on an actual message).
- **Blocklist checks** — query major DNSBLs for the sending IP/domain.
- **BIMI / MTA-STS / TLS-RPT** detection for the advanced auth layer.
- **Google Postmaster Tools** integration for real reputation/complaint data.
- **Subject/body spam-word linting** on pasted draft content.
- Persist scans and let users re-check after applying fixes (progress tracking).
