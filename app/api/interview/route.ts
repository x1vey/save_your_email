import { NextResponse } from "next/server";
import type { ScanResult } from "@/lib/types";
import { getLlm } from "@/lib/llm";
import { getRequestIdentity } from "@/lib/identity";
import { enforce, rateLimitResponse } from "@/lib/ratelimit";
import { TRIAGE_SYSTEM_PROMPT } from "@/lib/prompt";
import {
  buildTriageUserMessage,
  parseTriageResult,
  fallbackTriage,
} from "@/lib/interview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TriageBody {
  scan: ScanResult;
  problemStatement: string;
}

export async function POST(req: Request) {
  const { ip, userId } = await getRequestIdentity(req);
  const rl = await enforce("interview", { ip, userId });
  if (!rl.ok) return rateLimitResponse(rl);

  let body: TriageBody;
  try {
    body = (await req.json()) as TriageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scan, problemStatement = "" } = body;
  if (!scan || !scan.findings) {
    return NextResponse.json({ error: "Missing scan data" }, { status: 400 });
  }

  const llm = getLlm();
  if (!llm) {
    return NextResponse.json(fallbackTriage(scan));
  }

  try {
    const completion = await llm.client.chat.completions.create({
      model: llm.model,
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        { role: "user", content: buildTriageUserMessage(scan, problemStatement) },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const result = parseTriageResult(raw);
    // If the model produced something unusable, fall back to deterministic order.
    return NextResponse.json(result ?? fallbackTriage(scan));
  } catch {
    return NextResponse.json(fallbackTriage(scan));
  }
}
