import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-route limits, applied separately to IP and to account. Reports/scans are
// expensive (LLM / DNS), so they're tighter than interview/lint turns.
export type RouteName = "scan" | "interview" | "lint" | "report";

const WINDOW = "10 m" as const;
const LIMITS: Record<RouteName, { ip: number; acct: number }> = {
  scan: { ip: 20, acct: 40 },
  interview: { ip: 80, acct: 160 },
  lint: { ip: 60, acct: 120 },
  report: { ip: 15, acct: 30 },
};

// Resolve the Upstash client once. `undefined` = not yet checked, `null` = not
// configured (limiter fails open so the app still works locally / without Redis).
let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  if (!redis && process.env.NODE_ENV === "production") {
    console.warn("[ratelimit] Upstash not configured — rate limiting is DISABLED.");
  }
  return redis;
}

const cache = new Map<string, Ratelimit>();
function limiter(route: RouteName, scope: "ip" | "acct"): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${route}:${scope}`;
  let lim = cache.get(key);
  if (!lim) {
    lim = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(LIMITS[route][scope], WINDOW),
      prefix: `rl:${key}`,
      analytics: false,
    });
    cache.set(key, lim);
  }
  return lim;
}

export interface RateVerdict {
  ok: boolean;
  scope?: "ip" | "acct";
  limit?: number;
  remaining?: number;
  reset?: number; // epoch ms when the window resets
}

// Enforce IP limit always, plus account limit when authenticated. Fails open if
// Upstash isn't configured.
export async function enforce(
  route: RouteName,
  id: { ip: string; userId: string | null }
): Promise<RateVerdict> {
  const ipLim = limiter(route, "ip");
  if (!ipLim) return { ok: true };

  const ipRes = await ipLim.limit(`ip:${id.ip}`);
  if (!ipRes.success) {
    return { ok: false, scope: "ip", limit: ipRes.limit, remaining: ipRes.remaining, reset: ipRes.reset };
  }

  if (id.userId) {
    const acctLim = limiter(route, "acct");
    if (acctLim) {
      const aRes = await acctLim.limit(`acct:${id.userId}`);
      if (!aRes.success) {
        return { ok: false, scope: "acct", limit: aRes.limit, remaining: aRes.remaining, reset: aRes.reset };
      }
    }
  }

  return { ok: true, scope: "ip", limit: ipRes.limit, remaining: ipRes.remaining, reset: ipRes.reset };
}

// Best-effort client IP from common proxy headers.
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

// Standard 429 response with Retry-After + RateLimit headers.
export function rateLimitResponse(v: RateVerdict): Response {
  const retryAfter = v.reset ? Math.max(1, Math.ceil((v.reset - Date.now()) / 1000)) : 60;
  const who = v.scope === "acct" ? "account" : "IP";
  return new Response(
    JSON.stringify({ error: `Rate limit exceeded for this ${who}. Try again in ~${retryAfter}s.` }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "Retry-After": String(retryAfter),
        "RateLimit-Limit": String(v.limit ?? ""),
        "RateLimit-Remaining": String(v.remaining ?? 0),
        "RateLimit-Reset": String(retryAfter),
      },
    }
  );
}
