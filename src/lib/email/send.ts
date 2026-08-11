import "server-only";
import { render } from "@react-email/render";
import { Resend } from "resend";
import type { EmailContent } from "./templates";
import {
  applyTestRedirect,
  classifySendStatus,
  formatSendLog,
  type NotificationType,
} from "./routing";

// Resend wrapper. from and reply-to are the verified rallytime.xyz sender.
// Every path here swallows its own errors and returns a boolean; the actions
// wrap these in try/catch as a second backstop, so a mail failure can never
// change an action's return value.

const FROM = "Rally <hello@rallytime.xyz>";

// Resend's batch endpoint accepts at most 100 messages per call.
const BATCH_LIMIT = 100;

let resend: Resend | null = null;
function getResend(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is required to send email");
  resend = new Resend(key);
  return resend;
}

// One recipient (join and leave notices go to the host only). idempotencyKey
// guards against a double submit sending twice; when Resend rejects the
// duplicate, the send is logged status=deduped, not sent, so it does not inflate
// the volume count.
export async function sendNotification({
  type,
  activityId,
  to,
  content,
  idempotencyKey,
}: {
  type: NotificationType;
  activityId: string;
  to: string;
  content: EmailContent;
  idempotencyKey?: string;
}): Promise<boolean> {
  try {
    const routed = applyTestRedirect(to, content.subject);
    const html = await render(content.react);
    const { error } = await getResend().emails.send(
      {
        from: FROM,
        replyTo: FROM,
        to: routed.to,
        subject: routed.subject,
        html,
        text: content.text,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    const status = classifySendStatus(error?.name);
    console.log(formatSendLog(type, activityId, 1, status));
    if (status === "failed") {
      console.error("[email] send error", error);
      return false;
    }
    // "sent" and "deduped" both mean the notice is covered, not lost.
    return true;
  } catch (err) {
    console.log(formatSendLog(type, activityId, 1, "failed"));
    console.error("[email] send threw", err);
    return false;
  }
}

// Fan-out (activity cancelled) via the batch endpoint, capped at 100. Each
// message is rerouted independently under EMAIL_TEST_REDIRECT, so a test send
// stays identifiable per recipient.
export async function sendNotificationBatch({
  type,
  activityId,
  messages,
  idempotencyKey,
}: {
  type: NotificationType;
  activityId: string;
  messages: { to: string; content: EmailContent }[];
  idempotencyKey?: string;
}): Promise<boolean> {
  if (messages.length === 0) {
    console.log(formatSendLog(type, activityId, 0, "skipped"));
    return true;
  }

  const capped = messages.slice(0, BATCH_LIMIT);
  if (messages.length > BATCH_LIMIT) {
    console.warn(
      `[email] batch for activity ${activityId} truncated ${messages.length} -> ${BATCH_LIMIT}`,
    );
  }

  try {
    const payload = await Promise.all(
      capped.map(async ({ to, content }) => {
        const routed = applyTestRedirect(to, content.subject);
        const html = await render(content.react);
        return {
          from: FROM,
          replyTo: FROM,
          to: routed.to,
          subject: routed.subject,
          html,
          text: content.text,
        };
      }),
    );

    const { error } = await getResend().batch.send(
      payload,
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    const status = classifySendStatus(error?.name);
    console.log(formatSendLog(type, activityId, capped.length, status));
    if (status === "failed") {
      console.error("[email] batch send error", error);
      return false;
    }
    // "sent" and "deduped" both mean the notice is covered, not lost.
    return true;
  } catch (err) {
    console.log(formatSendLog(type, activityId, capped.length, "failed"));
    console.error("[email] batch send threw", err);
    return false;
  }
}
