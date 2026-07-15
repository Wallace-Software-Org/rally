import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendedActivity,
  AttendedHost,
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

// Lean username lookup for the personal feed at /feed/[username]. Same
// convention as getProfileByUsername (resolve by username, null when missing)
// but without the hosting/attending payload, so it can run in both
// generateMetadata and the page without the heavier joins. Wrapped in React
// cache() so those two callers dedupe to a single query per request.
export const getHostByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, instagram_handle")
    .eq("username", username)
    .single();
  return data;
});

export async function getProfileByUsername(
  username: string,
): Promise<ProfilePage | null> {
  const supabase = await createClient();

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

  // Attending is a read-only hub mirroring Hosting: include past and cancelled
  // activities the user joined (but does not host), with host + participant data.
  const activityIds = (participantRows ?? []).map((p) => p.activity_id);
  let going: AttendedActivity[] = [];
  if (activityIds.length > 0) {
    const { data: goingData } = await supabase
      .from("activities")
      .select(
        `
        id, title, sport, description, location_name, skill_level, starts_at,
        max_participants, visibility, status,
        host:profiles!activities_creator_id_fkey ( full_name, avatar_url, username ),
        participants (
          id, user_id,
          profiles ( full_name, avatar_url, username, instagram_handle )
        )
      `,
      )
      .in("id", activityIds)
      .neq("creator_id", profile.id)
      .order("starts_at", { ascending: true });
    going = normalizeAttending(goingData);
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

function normalizeRelation<T>(value: unknown): T | null {
  return (Array.isArray(value) ? (value[0] ?? null) : (value ?? null)) as
    | T
    | null;
}

function normalizeParticipants(
  participants: { id: string; user_id: string; profiles: unknown }[] | null,
) {
  return (participants ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    profiles: normalizeRelation<HostParticipantProfile>(p.profiles),
  }));
}

function normalizeAttending(
  data:
    | {
        host: unknown;
        participants: { id: string; user_id: string; profiles: unknown }[];
        [key: string]: unknown;
      }[]
    | null,
): AttendedActivity[] {
  return (data ?? []).map((a) => ({
    ...(a as unknown as AttendedActivity),
    host: normalizeRelation<AttendedHost>(a.host),
    participants: normalizeParticipants(a.participants),
  }));
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
    participants: normalizeParticipants(a.participants),
  }));
}
