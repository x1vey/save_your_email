import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { subject, copy } = await req.json();

    // Construct a raw MIME email string
    const rawEmail = `From: sender@example.com\nTo: recipient@example.com\nSubject: ${subject}\nDate: ${new Date().toUTCString()}\nMessage-Id: <test@example.com>\n\n${copy}`;

    const response = await fetch("https://spamcheck.postmarkapp.com/filter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: rawEmail,
        options: "short",
      }),
    });

    if (!response.ok) {
      throw new Error(`Spamcheck API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
