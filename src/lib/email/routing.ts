// Pure send-routing helpers. No server-only import here on purpose: this is the
// unit-tested core (test redirect, opt-in filtering, log formatting), so it must
// import cleanly in a plain test environment. The Resend calls live in send.ts.

export type NotificationType =
  | "activity_cancelled"
  | "participant_joined"
  | "participant_left";

// EMAIL_TEST_REDIRECT reroutes every recipient to a single test inbox in
// non-production (Preview + local), and prefixes the real recipient into the
// subject so the send is identifiable and never reaches a real user. When unset
// (Production), recipients and subjects pass through untouched.
export function applyTestRedirect(
  to: string,
  subject: string,
): { to: string; subject: string } {
  const redirect = process.env.EMAIL_TEST_REDIRECT?.trim();
  if (!redirect) return { to, subject };
  return { to: redirect, subject: `[test -> ${to}] ${subject}` };
}

// Drop recipients who have turned notifications off. Filtering happens here,
// before the address list reaches Resend, never after a send.
export function filterOptedIn<T extends { notification_emails: boolean }>(
  recipients: T[],
): T[] {
  return recipients.filter((r) => r.notification_emails);
}

export type SendStatus = "sent" | "deduped" | "failed" | "skipped";

// Classify a Resend send outcome from its error name. A successful send is
// "sent" and counts against the free-tier cap. An idempotent-replay collision
// (Resend rejects a duplicate Idempotency-Key that is still in flight) is
// "deduped": the original send already covers it and no new email is created, so
// it must NOT be counted as sent. Any other error is a real "failed".
export function classifySendStatus(
  errorName: string | null | undefined,
): Exclude<SendStatus, "skipped"> {
  if (!errorName) return "sent";
  if (errorName === "concurrent_idempotent_requests") return "deduped";
  return "failed";
}

// One structured line per send: the only visibility into volume against the
// Resend free-tier cap, so only status=sent should be counted. Keep it greppable
// and single-line.
export function formatSendLog(
  type: NotificationType,
  activityId: string,
  recipients: number,
  status: SendStatus,
): string {
  return `[email] type=${type} activityId=${activityId} recipients=${recipients} status=${status}`;
}
