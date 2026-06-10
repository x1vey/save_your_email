import { NextResponse } from "next/server";
import { scanDomain, normalizeDomain } from "@/lib/dns-scan";
import { getRequestIdentity } from "@/lib/identity";
import { enforce, rateLimitResponse } from "@/lib/ratelimit";

// DNS lookups need the Node runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ip, userId, supabase } = await getRequestIdentity(req);
  const rl = await enforce("scan", { ip, userId });
  if (!rl.ok) return rateLimitResponse(rl);

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.domain ?? "";
  const domain = normalizeDomain(raw);
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Please enter a valid domain, e.g. example.com" }, { status: 400 });
  }

  try {
    const result = await scanDomain(domain);

    // Persist for signed-in users; RLS restricts the row to this account.
    if (supabase && userId) {
      await supabase
        .from("scans")
        .insert({ user_id: userId, domain: result.domain, score: result.score, tech_score: result.techScore, result })
        .then(
          () => {},
          () => {}
        );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Scan failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
