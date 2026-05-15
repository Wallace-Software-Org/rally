"use server";

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
