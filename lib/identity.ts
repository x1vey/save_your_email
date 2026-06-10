import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ratelimit";

export interface RequestIdentity {
  ip: string;
  userId: string | null;
  // Present + authenticated → safe to write RLS-protected rows as this user.
  supabase: SupabaseClient | null;
}

// Resolve who is making this request: IP (for per-IP limits) and the Supabase
// user id (for per-account limits + RLS-scoped persistence). Both degrade to
// anonymous when their service isn't configured.
export async function getRequestIdentity(req: Request): Promise<RequestIdentity> {
  const ip = getClientIp(req);
  const supabase = await createClient();
  let userId: string | null = null;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  return { ip, userId, supabase };
}
