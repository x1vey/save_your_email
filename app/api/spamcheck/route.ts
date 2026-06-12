import { NextResponse } from "next/server";
import { getLlm, callFullSpamScan } from "@/lib/llm";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  try {
    // 1. Rate limiting (same as interview/rewrite)
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // 2. Parse request
    const body = await req.json();
    const { subject, copy } = body;

    if (typeof subject !== "string" || typeof copy !== "string") {
      return NextResponse.json(
        { error: "Missing subject or copy in request body" },
        { status: 400 }
      );
    }

    if (!subject.trim() && !copy.trim()) {
       return NextResponse.json(
        { error: "Both subject and copy cannot be empty" },
        { status: 400 }
      );
    }

    // 3. Setup LLM
    const llm = getLlm();
    if (!llm) {
      return NextResponse.json(
        { error: "No LLM provider configured (GROQ_API_KEY or OPENAI_API_KEY required)" },
        { status: 500 }
      );
    }

    // 4. Call the single-layer scan
    const result = await callFullSpamScan(llm, subject, copy);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate spam scan from LLM" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Spam Scan API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
