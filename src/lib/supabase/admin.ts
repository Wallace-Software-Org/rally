import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// SERVER-ONLY. This client authenticates with the Supabase secret key
// (SUPABASE_SECRET_KEY, an sb_secret_... key mapped to the service_role Postgres
// role), so it BYPASSES RLS and MUST never reach the browser. Use it only for
// reads and writes that deliberately need to bypass RLS, never as a convenience
// for a query the per-user clients in this folder can do. Currently:
//   - the notification recipient lookup (get_notification_recipient reads
//     auth.users and is granted to service_role only; see src/lib/email/client.ts)
//   - waiver acceptance inserts (waiver_acceptances grants no client role insert,
//     so acceptances are server-trusted; see src/lib/queries/waivers.ts)
// Keep the client behind narrow, purpose-built functions like those; do not hand
// it out. Do not import this file from a client component: the `server-only`
// import fails the build if it is pulled into a client bundle, and the window
// guard below is a second, runtime line of defense.

let client: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "The secret-key client was instantiated in a browser context",
    );
  }
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for service-role queries",
    );
  }

  client = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
