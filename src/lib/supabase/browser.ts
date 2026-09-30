"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Browser client, used for live updates. Shares the session cookie with the server. */
export function getSupabaseBrowserClient() {
  client ??= createBrowserClient(supabaseUrl(), supabasePublishableKey());
  return client;
}
