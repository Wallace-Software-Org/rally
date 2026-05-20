"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const { data: activity, error: actErr } = await supabase
    .from("activities")
    .insert({ ...data, creator_id: user.id, status: "open" })
    .select("id")
    .single();

  if (actErr) return { error: actErr.message };

  const { error: partErr } = await supabase
    .from("participants")
    .insert({ activity_id: activity.id, user_id: user.id, status: "joined" });

  if (partErr) return { error: partErr.message };

  revalidatePath("/");
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

  revalidatePath("/");
  revalidatePath(`/activity/${activityId}`);
  return { error: null };
}
