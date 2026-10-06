import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";

// SERVER-ONLY. Resolves the address an email notification is sent to. The address
// lives in auth.users, which only the get_notification_recipient function reads,
// and that function is granted to service_role only, never authenticated: user
// ids are already visible via participant lists, so an authenticated grant would
// be a working email-enumeration path (see the notification_emails migration and
// CLAUDE.md). So this goes through the admin client (src/lib/supabase/admin.ts)
// rather than the publishable-key clients. Do not add other queries here, and do
// not import this file from a client component.

export type NotificationRecipient = {
  email: string;
  full_name: string | null;
  notification_emails: boolean;
};

// Resolve one recipient's address, name, and notification toggle via the
// service_role-only function. Returns null when the user has no profile/auth row
// or no email. The toggle is returned as-is; the send layer filters on it before
// sending.
export async function getNotificationRecipient(
  userId: string,
): Promise<NotificationRecipient | null> {
  const { data, error } = await getAdminClient().rpc(
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
