"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function joinActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  // getUser() validates the JWT with the auth server — safer than getSession() which only reads the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("participants")
    .insert({ activity_id: activityId, user_id: user.id, status: "joined" });

  return { error: error?.message ?? null };
}

export async function leaveActivity(
  activityId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  // getUser() validates the JWT with the auth server — safer than getSession() which only reads the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", user.id);

  return { error: error?.message ?? null };
}

export async function createActivity(data: {
  sport: string;
  title: string;
  starts_at: string;
  max_participants: number | null;
  skill_level: string;
  description: string;
  external_link?: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  // getUser() validates the JWT with the auth server — safer than getSession() which only reads the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  let externalLink: string | null;
  try {
    externalLink = normalizeExternalLink(data.external_link);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid external link",
    };
  }

  const { data: activity, error: actErr } = await supabase
    .from("activities")
    .insert({
      ...data,
      external_link: externalLink,
      creator_id: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (actErr) return { error: actErr.message };

  const { error: partErr } = await supabase
    .from("participants")
    .insert({ activity_id: activity.id, user_id: user.id, status: "joined" });

  if (partErr) return { error: partErr.message };

  revalidatePath("/");
  revalidatePath(`/activity/${activity.id}`);
  redirect(`/activity/${activity.id}?posted=true`);
}

export async function updateActivity(
  activityId: string,
  data: {
    sport: string;
    title: string;
    description: string;
    starts_at: string;
    max_participants: number | null;
    skill_level: string;
    external_link?: string | null;
    location_name: string;
    lat: number | null;
    lng: number | null;
    status: string;
  },
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let externalLink: string | null;
  try {
    externalLink = normalizeExternalLink(data.external_link);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid external link",
    };
  }

  const { error } = await supabase
    .from("activities")
    .update({ ...data, external_link: externalLink })
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("activities")
    .update({ status: "cancelled" })
    .eq("id", activityId)
    .eq("creator_id", user.id);

  if (error) return { error: error.message };

  await supabase.from("participants").delete().eq("activity_id", activityId);

  revalidatePath("/");
  revalidatePath(`/activity/${activityId}`);
  return { error: null };
}
