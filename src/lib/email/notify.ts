import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getNotificationRecipient } from "./client";
import { sendNotification, sendNotificationBatch } from "./send";
import {
  activityCancelledEmail,
  participantJoinedEmail,
  participantLeftEmail,
  type ActivityInfo,
} from "./templates";

// Orchestration for the three V1 notices. Each function is called from a server
// action via after(); the action wraps the call in try/catch so a failure here
// can never change its return value.
//
// Division of labor with the secret-key client: get_notification_recipient (the
// only reader of auth.users) is used ONLY to resolve the address + opt-in of the
// person being emailed. Names of other people (the joiner, the leaver, the host
// on a cancel) come from profiles through the caller's normal RLS client, since
// names do not live in auth.users.

type DB = SupabaseClient<Database>;

async function loadActivity(
  supabase: DB,
  activityId: string,
): Promise<(ActivityInfo & { creatorId: string }) | null> {
  const { data } = await supabase
    .from("activities")
    .select("id, title, starts_at, creator_id, max_participants")
    .eq("id", activityId)
    .single();
  if (!data || !data.creator_id) return null;

  // Live count so the join/leave notices show the same "N spots left" as the
  // app, as of the moment the notice is sent.
  const { count } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activityId);

  return {
    id: data.id,
    title: data.title,
    startsAt: data.starts_at,
    maxParticipants: data.max_participants,
    participantCount: count ?? 0,
    creatorId: data.creator_id,
  };
}

async function getProfileName(
  supabase: DB,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  return data?.full_name ?? null;
}

// Someone joined -> email the host. Hosts auto-join their own activities, so a
// self-join is never a notification.
export async function notifyParticipantJoined(
  supabase: DB,
  activityId: string,
  joinerId: string,
): Promise<void> {
  const activity = await loadActivity(supabase, activityId);
  if (!activity || activity.creatorId === joinerId) return;

  const host = await getNotificationRecipient(activity.creatorId);
  if (!host || !host.notification_emails) return; // opt-out filtered before send

  // Per-event idempotency: the participant row id is unique to this join, but
  // stays the same if the join action double-fires (join_activity's ON CONFLICT
  // keeps the one row). So a double submit dedupes, while a genuine leave then
  // rejoin is a new row, a new key, and a second notice, which is what the host
  // should get. A stable join:{activityId}:{userId} key would wrongly suppress
  // the rejoin within Resend's idempotency window.
  const { data: row } = await supabase
    .from("participants")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", joinerId)
    .maybeSingle();
  if (!row) return; // membership already gone

  const joinerName = await getProfileName(supabase, joinerId);
  const content = participantJoinedEmail({
    activity,
    participantName: joinerName,
  });

  await sendNotification({
    type: "participant_joined",
    activityId,
    to: host.email,
    content,
    idempotencyKey: `join:${row.id}`,
  });
}

// Someone left -> email the host. The leaver's participant row is already gone,
// but their profile (and name) remains.
export async function notifyParticipantLeft(
  supabase: DB,
  activityId: string,
  leaverId: string,
  // The id of the participant row that was just deleted. Unique to this leave
  // event, so a rejoin-then-leave later is a distinct notice.
  participantRowId: string,
): Promise<void> {
  const activity = await loadActivity(supabase, activityId);
  if (!activity || activity.creatorId === leaverId) return;

  const host = await getNotificationRecipient(activity.creatorId);
  if (!host || !host.notification_emails) return; // opt-out filtered before send

  const leaverName = await getProfileName(supabase, leaverId);
  const content = participantLeftEmail({
    activity,
    participantName: leaverName,
  });

  await sendNotification({
    type: "participant_left",
    activityId,
    to: host.email,
    content,
    idempotencyKey: `leave:${participantRowId}`,
  });
}

// Activity cancelled -> fan out to every participant except the creator, via the
// batch endpoint. Opt-outs are filtered before the address list is built.
export async function notifyActivityCancelled(
  supabase: DB,
  activityId: string,
): Promise<void> {
  const activity = await loadActivity(supabase, activityId);
  if (!activity) return;

  const { data: rows } = await supabase
    .from("participants")
    .select("user_id")
    .eq("activity_id", activityId)
    .neq("user_id", activity.creatorId);

  const recipientIds = (rows ?? [])
    .map((r) => r.user_id)
    .filter((id): id is string => id !== null && id !== activity.creatorId);
  if (recipientIds.length === 0) return;

  const hostName = await getProfileName(supabase, activity.creatorId);
  const content = activityCancelledEmail({ activity, hostName });

  const resolved = await Promise.all(
    recipientIds.map((id) => getNotificationRecipient(id)),
  );
  const messages = resolved
    .filter((r) => r !== null && r.notification_emails)
    .map((r) => ({ to: r!.email, content }));
  if (messages.length === 0) return;

  await sendNotificationBatch({
    type: "activity_cancelled",
    activityId,
    messages,
    idempotencyKey: `cancel:${activityId}`,
  });
}
