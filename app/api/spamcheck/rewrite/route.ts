import { NextRequest, NextResponse } from "next/server";
import { getLlm, callSpamRewrite } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { flaggedPhrase, rule, surroundingContext } = await req.json();

    if (!flaggedPhrase || typeof flaggedPhrase !== "string") {
      return NextResponse.json({ error: "flaggedPhrase is required" }, { status: 400 });
    }

    const llm = getLlm();
    if (!llm) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await callSpamRewrite(
      llm,
      flaggedPhrase,
      rule || "unknown",
      surroundingContext || flaggedPhrase
    );

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("Spam rewrite error:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
