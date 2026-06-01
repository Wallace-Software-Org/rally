import { createClient } from "@/lib/supabase/server";
import type { ProfilePage } from "@/types";

export async function getProfileById(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, instagram_handle, sports")
    .eq("id", userId)
    .single();
  return data;
}

export async function getProfileByUsername(
  username: string,
): Promise<ProfilePage | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, instagram_handle, sports")
    .eq("username", username)
    .single();

  if (!profile) return null;

  const [
    { count: hostedCount },
    { count: attendedCount },
    { data: hosting },
    { data: participantRows },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profile.id),
    supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase
      .from("activities")
      .select("id, title, sport, location_name, skill_level, starts_at")
      .eq("creator_id", profile.id)
      .eq("status", "open")
      .gt("starts_at", now)
      .order("starts_at", { ascending: true }),
    supabase
      .from("participants")
      .select("activity_id")
      .eq("user_id", profile.id),
  ]);

  // Fetch upcoming activities the user is attending (but not hosting)
  const activityIds = (participantRows ?? []).map((p) => p.activity_id);
  let going: ProfilePage["going"] = [];
  if (activityIds.length > 0) {
    const { data: goingData } = await supabase
      .from("activities")
      .select("id, title, sport, location_name, skill_level, starts_at")
      .in("id", activityIds)
      .neq("creator_id", profile.id)
      .eq("status", "open")
      .gt("starts_at", now)
      .order("starts_at", { ascending: true });
    going = goingData ?? [];
  }

  return {
    ...profile,
    sports: (profile.sports ?? []) as string[],
    hosted_count: hostedCount ?? 0,
    attended_count: attendedCount ?? 0,
    going,
    hosting: hosting ?? [],
  };
}
