"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect, RedirectType } from "next/navigation";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { nextWeeklyOccurrence } from "@/lib/utils/next-occurrence";
import { validateActivityInput } from "@/lib/utils/activity-validation";
import { requireUser } from "@/lib/actions/require-user";
import { ACTIVITY_FULL_ERROR } from "@/lib/utils/activity-participants";
import {
  notifyActivityCancelled,
  notifyParticipantJoined,
  notifyParticipantLeft,
} from "@/lib/email/notify";

const PREDEFINED_SPORTS = new Set(
  SPORTS_LIST.filter((sport) => sport !== "All").map((sport) =>
    sport.toLowerCase(),
  ),
);

function normalizeExternalLink(link: string | null | undefined): string | null {
  const value = link?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // handled below
  }

  throw new Error("External link must be a valid http or https URL");
}

function normalizeSport(sport: string): string {
  const key = sport.trim().toLowerCase();
  if (!key) throw new Error("Sport is required");
  if (!PREDEFINED_SPORTS.has(key)) throw new Error("Invalid sport");
  return key;
}

export async function joinActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  // Atomic capacity + status check server-side (see join_activity RPC). The
  // function locks the activity row so concurrent joins can't exceed the cap.
  const { data, error } = await supabase.rpc("join_activity", {
    p_activity_id: activityId,
  });
  if (error) return { error: error.message };

  switch (data) {
    case "ok":
      // Email the host after responding. Swallow-and-log: a mail failure must
      // never change the { error } contract. The idempotency key inside makes a
      // double submit a no-op.
      after(async () => {
        try {
          await notifyParticipantJoined(supabase, activityId, user.id);
        } catch (err) {
          console.error("[email] join notification failed", err);
        }
      });
      return { error: null };
    case "full":
      return { error: ACTIVITY_FULL_ERROR };
    case "closed":
      return { error: "This activity is no longer open" };
    case "not_found":
      return { error: "Activity not found" };
    default:
      return { error: "Could not join this activity" };
  }
}

export async function leaveActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  // select() returns the deleted rows so we only notify on a real leave, never
  // on a no-op delete (user was not a participant).
  const { data: removed, error } = await supabase
    .from("participants")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .select("id");

  if (!error && removed && removed.length > 0) {
    // Email the host after responding. Swallow-and-log; return value untouched.
    // Pass the deleted row id so the notice is keyed to this leave event.
    const removedRowId = removed[0].id;
    after(async () => {
      try {
        await notifyParticipantLeft(supabase, activityId, user.id, removedRowId);
      } catch (err) {
        console.error("[email] leave notification failed", err);
      }
    });
  }

  return { error: error?.message ?? null };
}

export async function createActivity(data: {
  sport: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  visibility?: "public" | "private";
  max_participants: number | null;
  skill_level: string;
  description: string;
  external_link?: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
}): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const validationError = validateActivityInput(data, { requireFuture: true });
  if (validationError) return { error: validationError };

  let externalLink: string | null;
  let sport: string;
  try {
    externalLink = normalizeExternalLink(data.external_link);
    sport = normalizeSport(data.sport);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid activity",
    };
  }

  const { ends_at: rawEndsAt, visibility, ...rest } = data;
  const endsAt =
    rawEndsAt ??
    new Date(
      new Date(data.starts_at).getTime() + 60 * 60 * 1000,
    ).toISOString();

  const { data: activity, error: actErr } = await supabase
    .from("activities")
    .insert({
      ...rest,
      sport,
      external_link: externalLink,
      ends_at: endsAt,
      visibility: visibility ?? "public",
      creator_id: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (actErr) return { error: actErr.message };

  const { error: partErr } = await supabase
    .from("participants")
    .insert({ activity_id: activity.id, user_id: user.id, status: "joined" });

  if (partErr) {
    await supabase
      .from("activities")
      .delete()
      .eq("id", activity.id)
      .eq("creator_id", user.id);

    return { error: partErr.message };
  }

  revalidatePath("/");
  revalidatePath(`/activity/${activity.id}`);
  redirect(`/activity/${activity.id}?posted=true`, RedirectType.replace);
}

export async function updateActivity(
  activityId: string,
  data: {
    sport: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at?: string | null;
    visibility?: "public" | "private";
    max_participants: number | null;
    skill_level: string;
    external_link?: string | null;
    location_name: string;
    lat: number | null;
    lng: number | null;
  },
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const validationError = validateActivityInput(data, { requireFuture: false });
  if (validationError) return { error: validationError };

  let externalLink: string | null;
  let sport: string;
  try {
    externalLink = normalizeExternalLink(data.external_link);
    sport = normalizeSport(data.sport);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid activity",
    };
  }

  const { error } = await supabase
    .from("activities")
    .update({ ...data, sport, external_link: externalLink })
    .eq("id", activityId)
    .eq("creator_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/activity/${activityId}`);
  return { error: null };
}

export async function cancelActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  // Soft cancel: flip status only. Participants are kept so people who joined
  // still see it as cancelled and the host card can show how many had joined.
  // neq("status", "cancelled") makes this a real open->cancelled transition:
  // select() then returns a row only the first time, so a re-cancel does not
  // re-fire the fan-out (and never inflates the send log).
  const { data: cancelled, error } = await supabase
    .from("activities")
    .update({ status: "cancelled" })
    .eq("id", activityId)
    .eq("creator_id", user.id)
    .neq("status", "cancelled")
    .select("id");

  if (error) return { error: error.message };

  if (cancelled && cancelled.length > 0) {
    // Fan out to participants (except the creator) after responding.
    // Swallow-and-log; return value untouched.
    after(async () => {
      try {
        await notifyActivityCancelled(supabase, activityId);
      } catch (err) {
        console.error("[email] cancel notification failed", err);
      }
    });
  }

  revalidatePath("/");
  revalidatePath(`/activity/${activityId}`);
  revalidatePath("/profile/[username]", "page");
  return { error: null };
}

// Repeat: open the create form pre-filled from an owned activity, with the date
// advanced 7 days. It inserts nothing; the host reviews and posts through the
// normal create flow.
export async function repeatActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const { supabase, user, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const { data: source } = await supabase
    .from("activities")
    .select(
      `
      title, sport, description, external_link, location_name, starts_at,
      visibility, max_participants, skill_level, lat, lng
    `,
    )
    .eq("id", activityId)
    .eq("creator_id", user.id)
    .single();

  if (!source) return { error: "Activity not found" };

  const params = new URLSearchParams();
  params.set("title", source.title ?? "");
  params.set("sport", source.sport ?? "");
  params.set("location", source.location_name ?? "");
  params.set("description", source.description ?? "");
  params.set("skill_level", source.skill_level ?? "");
  params.set("visibility", source.visibility ?? "public");
  if (source.starts_at) {
    params.set("starts_at", nextWeeklyOccurrence(source.starts_at));
  }
  if (typeof source.lat === "number") params.set("lat", String(source.lat));
  if (typeof source.lng === "number") params.set("lng", String(source.lng));
  if (source.max_participants != null) {
    params.set("max_participants", String(source.max_participants));
  }
  if (source.external_link) params.set("external_link", source.external_link);

  redirect(`/activity/new?${params.toString()}`, RedirectType.replace);
}
