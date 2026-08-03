import { createClient } from "@/lib/supabase/server";
import type {
  ActivityDetail,
  ActivityHostSummary,
  ActivityWithParticipants,
  DetailParticipantProfile,
  ParticipantProfile,
} from "@/types";
import type { Database } from "@/types/supabase";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

// The feed query row as returned by Supabase for the select below. Scalar
// columns come straight from the generated row type; the embedded host (to-one)
// and participants (to-many) are spelled out to match the select. host.username
// is optional because the main feed omits it and the personal feed includes it.
type FeedActivityRow = Pick<
  ActivityRow,
  | "id"
  | "creator_id"
  | "title"
  | "sport"
  | "external_link"
  | "location_name"
  | "starts_at"
  | "ends_at"
  | "visibility"
  | "max_participants"
  | "skill_level"
  | "lat"
  | "lng"
> & {
  host: {
    full_name: string | null;
    avatar_url: string | null;
    username?: string | null;
  } | null;
  participants: {
    id: string;
    user_id: string | null;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  }[];
};

export async function getActivities(): Promise<ActivityWithParticipants[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseQuery = supabase
    .from("activities")
    .select(
      `
      id, creator_id, title, sport, external_link, location_name, starts_at,
      ends_at, visibility, max_participants, skill_level, lat, lng,
      host:profiles!activities_creator_id_fkey ( full_name, avatar_url ),
      participants ( id, user_id, profiles ( full_name, avatar_url ) )
    `,
    )
    .eq("status", "open")
    .gt("starts_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()); // Arizona is UTC-7 (no DST); 3h buffer keeps local-time activities visible

  if (!user) {
    const { data } = await baseQuery
      .eq("visibility", "public")
      .order("starts_at", { ascending: true });
    return normalize(data);
  }

  // Fetch activity IDs the user is a participant in so private activities they
  // joined can be included. PostgREST's .or() can't reference a foreign table
  // directly, so we resolve the IDs in a separate query and fold them in.
  const { data: participantRows } = await supabase
    .from("participants")
    .select("activity_id")
    .eq("user_id", user.id);

  const participantIds = (participantRows ?? []).map((r) => r.activity_id);

  let orFilter = `visibility.eq.public,creator_id.eq.${user.id}`;
  if (participantIds.length > 0) {
    orFilter += `,id.in.(${participantIds.join(",")})`;
  }

  const { data } = await baseQuery
    .or(orFilter)
    .order("starts_at", { ascending: true });

  return normalize(data);
}

// Upcoming public activities a profile is hosting OR attending, for the personal
// feed at /feed/[username]. Same select shape as getActivities so the feed cards
// render identically (host select adds username so attending cards can link the
// "Hosted by" line); no visibility folding (private activities are unlisted), no
// filters, no radius logic.
//
// Implemented as two queries — hosted (creator_id) and joined (a participant
// row) — merged and deduped by activity id, since a host also has a participant
// row on their own activities. Sorted by starts_at asc.
export async function getActivitiesByUser(
  userId: string,
): Promise<ActivityWithParticipants[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const select = `
    id, creator_id, title, sport, external_link, location_name, starts_at,
    ends_at, visibility, max_participants, skill_level, lat, lng,
    host:profiles!activities_creator_id_fkey ( full_name, avatar_url, username ),
    participants ( id, user_id, profiles ( full_name, avatar_url ) )
  `;

  const [{ data: joinedRows }, { data: hosted }] = await Promise.all([
    supabase.from("participants").select("activity_id").eq("user_id", userId),
    supabase
      .from("activities")
      .select(select)
      .eq("creator_id", userId)
      .eq("status", "open")
      .eq("visibility", "public")
      .gte("starts_at", nowIso),
  ]);

  const joinedIds = (joinedRows ?? [])
    .map((r) => r.activity_id)
    .filter((id): id is string => id !== null);
  const { data: joined } =
    joinedIds.length > 0
      ? await supabase
          .from("activities")
          .select(select)
          .in("id", joinedIds)
          .eq("status", "open")
          .eq("visibility", "public")
          .gte("starts_at", nowIso)
      : { data: [] };

  // Merge, dedupe by id (a hosted activity is also a joined row), sort asc.
  const byId = new Map<string, ActivityWithParticipants>();
  for (const a of normalize(hosted)) byId.set(a.id, a);
  for (const a of normalize(joined)) byId.set(a.id, a);

  return [...byId.values()].sort((a, b) =>
    a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0,
  );
}

// Flatten the embedded host relation (Supabase returns it as an object for this
// to-one join) and the participant->profiles relations into the domain shape.
// TODO: the trailing assertion narrows loose schema nullability the app treats
// as present (creator_id, location_name, participants.user_id lack NOT NULL, and
// visibility is a plain string in the DB). Add those NOT NULL constraints + a
// visibility enum to drop the cast. It is a nullability-only narrowing, so TS
// still flags any dropped column.
function normalize(data: FeedActivityRow[] | null): ActivityWithParticipants[] {
  return (data ?? []).map((a) => ({
    ...a,
    host: normalizeRelation<ActivityHostSummary>(a.host),
    participants: a.participants.map((p) => ({
      ...p,
      profiles: normalizeRelation<ParticipantProfile>(p.profiles),
    })),
  })) as ActivityWithParticipants[];
}

function normalizeRelation<T>(value: unknown): T | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  return (normalized ?? null) as T | null;
}

export async function getActivityById(
  id: string,
  requesterId: string | null = null,
): Promise<ActivityDetail | "private" | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select(
      `
      id, title, sport, description, external_link, location_name, starts_at,
      max_participants, skill_level, lat, lng, status, creator_id, visibility,
      participants (
        id, user_id,
        profiles ( full_name, avatar_url, instagram_handle, username )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!data) return null;

  // Private means unlisted, not invite-only: any authenticated user who has the
  // direct link can view and join. Only logged-out visitors hit the gate, so
  // they can log in and then view. Feed/map exclusion is handled by getActivities.
  if (data.visibility === "private" && requesterId === null) {
    return "private";
  }

  // creator_id is nullable in the schema but always set for a real activity;
  // narrow it here so the host lookups below are typed and treat a creatorless
  // row as not found.
  if (!data.creator_id) return null;

  const [{ data: host }, { count: hostedCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, instagram_handle, username")
      .eq("id", data.creator_id)
      .single(),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", data.creator_id),
  ]);

  if (!host) return null;

  // TODO: nullability-only narrowing to the domain shape. The DB leaves
  // participants.user_id and profile columns (host.full_name) nullable and types
  // visibility/status as plain strings, but the app treats them as present. Add
  // NOT NULL constraints + a visibility enum to drop the cast. TS still checks
  // the object shape, so a dropped column would fail.
  return {
    ...data,
    participants: data.participants.map((p) => ({
      ...p,
      profiles: normalizeRelation<DetailParticipantProfile>(p.profiles),
    })),
    host,
    hosted_count: hostedCount ?? 0,
  } as ActivityDetail;
}
