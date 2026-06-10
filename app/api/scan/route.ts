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

  let raw = (body.domain ?? "").trim();
  let email = "";
  if (raw.includes("@")) {
    email = raw;
    raw = raw.split("@")[1] || "";
  }

  const domain = normalizeDomain(raw);
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Please enter a valid email or domain, e.g. user@example.com" }, { status: 400 });
  }

  try {
    const result = await scanDomain(domain);

    // Save lead email if provided
    let leadEmailId: string | null = null;
    if (email && supabase) {
      const { data, error } = await supabase
        .from("lead_emails")
        .insert({ email })
        .select("id")
        .single();
      if (data && !error) {
        leadEmailId = data.id;
      }
    }

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

    return NextResponse.json({ ...result, leadEmailId, leadEmail: email });
  } catch (err) {
    return NextResponse.json(
      { error: `Scan failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
