import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Extra origins allowed to call the API, comma-separated, e.g.
// ALLOWED_ORIGINS="https://app.example.com,https://staging.example.com".
// Same-origin is always allowed; everything else is denied.
function extraAllowed(): string[] {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, host: string | null): boolean {
  try {
    const o = new URL(origin);
    if (host && o.host === host) return true; // same-origin
    return extraAllowed().includes(`${o.protocol}//${o.host}`) || extraAllowed().includes(origin);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CORS: lock /api to same-origin (plus any ALLOWED_ORIGINS) ---
  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    // A cross-origin browser request always sends Origin. Same-origin requests
    // send it too on POST, so an Origin that doesn't match host = cross-site.
    if (origin && !isAllowedOrigin(origin, request.headers.get("host"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    // Preflight (rare for same-origin) — acknowledge without exposing the API.
    if (request.method === "OPTIONS") {
      const res = new NextResponse(null, { status: 204 });
      if (origin) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Content-Type");
        res.headers.set("Access-Control-Max-Age", "86400");
        res.headers.set("Vary", "Origin");
      }
      return res;
    }
  }

  // --- Keep the Supabase session fresh for everything else ---
  return updateSession(request);
}

export const config = {
  // Run on everything except Next static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
