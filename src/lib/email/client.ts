import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// SERVER-ONLY. This client authenticates with the Supabase secret key
// (SUPABASE_SECRET_KEY, an sb_secret_... key mapped to the service_role Postgres
// role), so it MUST never reach the browser. It exists for exactly one reason:
// to call get_notification_recipient, which reads auth.users and is granted to
// service_role only (see the notification_emails migration and CLAUDE.md). The
// recipient lookup cannot be exposed to the authenticated role without opening
// an email-enumeration path, which is why this dedicated client exists rather
// than reusing the publishable-key clients in src/lib/supabase/. Do not add any
// other query here, and do not import this file from a client component. The
// `server-only` import fails the build if it is pulled into a client bundle; the
// window guard below is a second, runtime line of defense.

export type NotificationRecipient = {
  email: string;
  full_name: string | null;
  notification_emails: boolean;
};

let client: SupabaseClient<Database> | null = null;

function getSecretClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "The email secret-key client was instantiated in a browser context",
    );
  }
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required to resolve email recipients",
    );
  }

  client = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Resolve one recipient's address, name, and notification toggle via the
// service_role-only function. Returns null when the user has no profile/auth row
// or no email. The toggle is returned as-is; the send layer filters on it before
// sending.
export async function getNotificationRecipient(
  userId: string,
): Promise<NotificationRecipient | null> {
  const { data, error } = await getSecretClient().rpc(
    "get_notification_recipient",
    { p_user_id: userId },
  );
  if (error) throw error;

  const row = data?.[0];
  if (!row || !row.email) return null;

  return {
    email: row.email,
    full_name: row.full_name,
    notification_emails: row.notification_emails,
  };
}
