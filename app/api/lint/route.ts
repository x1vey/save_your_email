import { NextResponse } from "next/server";
import { lintEmail } from "@/lib/spam-lint";
import { getRequestIdentity } from "@/lib/identity";
import { enforce, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ip, userId } = await getRequestIdentity(req);
  const rl = await enforce("lint", { ip, userId });
  if (!rl.ok) return rateLimitResponse(rl);

  let body: { subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = body.subject ?? "";
  const emailBody = body.body ?? "";
  if (!subject.trim() && !emailBody.trim()) {
    return NextResponse.json({ error: "Provide a subject and/or body to check." }, { status: 400 });
  }

  const result = lintEmail(subject, emailBody);
  return NextResponse.json(result);
}
