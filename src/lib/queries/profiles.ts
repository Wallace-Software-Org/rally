import { createClient } from "@/lib/supabase/server";
import type {
  HostedActivity,
  HostParticipantProfile,
  ProfilePage,
} from "@/types";

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
    // Hosting is a management surface: include past and cancelled activities,
    // plus the participant data the management cards render.
    supabase
      .from("activities")
      .select(
        `
        id, title, sport, description, location_name, skill_level, starts_at,
        max_participants, visibility, status,
        participants (
          id, user_id,
          profiles ( full_name, avatar_url, username, instagram_handle )
        )
      `,
      )
      .eq("creator_id", profile.id)
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
    hosting: normalizeHosting(hosting),
  };
}

// Supabase infers the participant->profiles join as an array at the type level
// but it is an object at runtime; normalize so HostParticipant matches.
function normalizeHosting(
  data:
    | {
        participants: { id: string; user_id: string; profiles: unknown }[];
        [key: string]: unknown;
      }[]
    | null,
): HostedActivity[] {
  return (data ?? []).map((a) => ({
    ...(a as unknown as HostedActivity),
    participants: (a.participants ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      profiles: (Array.isArray(p.profiles)
        ? (p.profiles[0] ?? null)
        : (p.profiles ?? null)) as HostParticipantProfile | null,
    })),
  }));
}
