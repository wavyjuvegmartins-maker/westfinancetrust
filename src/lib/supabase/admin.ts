import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * Supabase with the secret key. It bypasses row level security, so it's only
 * used on the server for jobs a signed-in user can't do themselves: creating
 * logins, looking up a login ID, issuing cards. Always check the caller first.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set. Add it to .env.local.");
  return createClient(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
