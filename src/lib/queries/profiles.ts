import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendedActivity,
  AttendedHost,
  HostedActivity,
  HostParticipantProfile,
  ProfilePage,
} from "@/types";
import type { Database } from "@/types/supabase";
import { toVisibility } from "@/lib/utils/visibility";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];

// Query rows as returned by Supabase for the Hosting/Attending selects below.
// Scalars come from the generated row type; the embedded relations are spelled
// out to match each select.
type HostingRow = Pick<
  ActivityRow,
  | "id"
  | "title"
  | "sport"
  | "description"
  | "location_name"
  | "skill_level"
  | "starts_at"
  | "max_participants"
  | "visibility"
  | "status"
> & {
  participants: (Pick<ParticipantRow, "id" | "user_id"> & {
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
      username: string | null;
      instagram_handle: string | null;
    } | null;
  })[];
};

type AttendingRow = HostingRow & {
  host: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

export async function getProfileById(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, instagram_handle, sports, notification_emails",
    )
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

// `viewerId` is the signed-in user, or null. Attending is owner-only, so the
// list is fetched only when the viewer owns the profile: hiding the tab in the
// UI alone would still ship a stranger's joined activities in the page payload.
export async function getProfileByUsername(
  username: string,
  viewerId: string | null = null,
): Promise<ProfilePage | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, instagram_handle, sports")
    .eq("username", username)
    .single();

  if (!profile) return null;

  const isOwnerView = viewerId != null && viewerId === profile.id;

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
    // Owner only, per above. A visitor gets no rows, so `going` stays empty.
    isOwnerView
      ? supabase
          .from("participants")
          .select("activity_id")
          .eq("user_id", profile.id)
      : Promise.resolve({ data: null }),
  ]);

  // Attending is a read-only hub mirroring Hosting: include past and cancelled
  // activities the user joined (but does not host), with host + participant data.
  const activityIds = (participantRows ?? [])
    .map((p) => p.activity_id)
    .filter((id): id is string => id !== null);
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
    sports: profile.sports ?? [],
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
  participants: HostingRow["participants"] | null,
) {
  return (participants ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    profiles: normalizeRelation<HostParticipantProfile>(p.profiles),
  }));
}

// Flatten the embedded host relation into the domain shape. toVisibility bridges
// the DB's plain visibility string to the domain union; the NOT NULL constraints
// make everything else line up without an assertion. Profile full_name stays
// nullable (see the profile types) and is handled at render.
function normalizeAttending(data: AttendingRow[] | null): AttendedActivity[] {
  return (data ?? []).map((a) => ({
    ...a,
    visibility: toVisibility(a.visibility),
    host: normalizeRelation<AttendedHost>(a.host),
    participants: normalizeParticipants(a.participants),
  }));
}

function normalizeHosting(data: HostingRow[] | null): HostedActivity[] {
  return (data ?? []).map((a) => ({
    ...a,
    visibility: toVisibility(a.visibility),
    participants: normalizeParticipants(a.participants),
  }));
}
