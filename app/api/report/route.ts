import { NextResponse } from "next/server";
import type { ReportRequest, ReportResponse } from "@/lib/types";
import { behavioralFindings, computeFinalScore, buildFallbackMarkdown } from "@/lib/report";
import { getLlm } from "@/lib/llm";
import { DIAGNOSIS_SYSTEM_PROMPT } from "@/lib/prompt";
import { getRequestIdentity } from "@/lib/identity";
import { enforce, rateLimitResponse } from "@/lib/ratelimit";
import { knownFactsFromScan } from "@/lib/interview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { ip, userId, supabase } = await getRequestIdentity(req);
  const rl = await enforce("report", { ip, userId });
  if (!rl.ok) return rateLimitResponse(rl);

  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scan, answers, problemStatement, triageSlots } = body;
  if (!scan || !scan.findings) {
    return NextResponse.json({ error: "Missing scan data" }, { status: 400 });
  }

  const behavioral = behavioralFindings(answers ?? {}, scan);
  const finalScore = computeFinalScore(scan, behavioral);
  const fallback = buildFallbackMarkdown(scan, behavioral, finalScore, problemStatement);

  // Persist the finished report for signed-in users (RLS-scoped to the account).
  const persist = async (res: ReportResponse) => {
    if (!supabase || !userId) return;
    await supabase
      .from("reports")
      .insert({
        user_id: userId,
        domain: scan.domain,
        sending_platform: (answers?.sending_platform as string) || null,
        answers: answers ?? {},
        problem_statement: problemStatement || null,
        triage_slots: triageSlots ?? null,
        markdown: res.markdown || null,
        final_score: res.finalScore,
        source: res.source,
      })
      .then(
        () => {},
        () => {}
      );
  };

  const llm = getLlm();
  if (!llm) {
    const res: ReportResponse = { status: "complete", markdown: fallback, source: "fallback", finalScore };
    await persist(res);
    return NextResponse.json(res);
  }

  try {
    // Build the structured user message for Call 2 (Diagnosis).
    const userContent = JSON.stringify(
      {
        domain: scan.domain,
        detectedProvider: scan.esp?.name ?? "unknown",
        finalScore,
        problemStatement: (problemStatement || "").trim() || "(No specific problem stated)",
        knownFromScan: knownFactsFromScan(scan),
        technicalFindings: scan.findings,
        behavioralFindings: behavioral,
        interviewAnswers: answers,
      },
      null,
      2
    );

    const completion = await llm.client.chat.completions.create({
      model: llm.model,
      max_tokens: 2500,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the complete diagnostic dataset. Produce the action plan.\n\n${userContent}`,
        },
      ],
    });

    const content = (completion.choices[0]?.message?.content || "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If parsing fails completely, fallback
      parsed = { status: "complete", markdown: content || fallback };
    }

    const status = parsed.status === "inconclusive" ? "inconclusive" : "complete";
    const markdown = parsed.markdown || (status === "complete" ? fallback : undefined);
    const followUpQuestions = parsed.followUpQuestions || undefined;

    const res: ReportResponse = {
      status,
      markdown,
      followUpQuestions,
      source: parsed.markdown || parsed.followUpQuestions ? "ai" : "fallback",
      finalScore,
    };
    await persist(res);
    return NextResponse.json(res);
  } catch (err) {
    // If the LLM call fails for any reason, still return the deterministic report.
    const res: ReportResponse & { warning?: string } = {
      status: "complete",
      markdown: fallback,
      source: "fallback",
      finalScore,
      warning: (err as Error).message,
    };
    await persist(res);
    return NextResponse.json(res);
  }
}
