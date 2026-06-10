import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cookie-bound Supabase client for Server Components and Route Handlers.
// Returns null when Supabase isn't configured, so callers treat the request as
// anonymous and skip any persistence — the app keeps working without a DB.
export async function createClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In a pure Server Component render this can throw (read-only cookies);
        // that's fine — session refresh is handled by the middleware.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* no-op */
        }
      },
    },
  });
}
