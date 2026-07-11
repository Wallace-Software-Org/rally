import { createClient } from "@/lib/supabase/server";
import type {
  ActivityDetail,
  ActivityHostSummary,
  ActivityWithParticipants,
  DetailParticipantProfile,
  ParticipantProfile,
} from "@/types";

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

  const joinedIds = (joinedRows ?? []).map((r) => r.activity_id);
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

// Supabase without generated types infers many-to-one joins as arrays at the
// type level but they are objects at runtime. Normalize so Participant matches.
function normalize(
  data: {
    host: unknown;
    participants: { id: string; user_id: string; profiles: unknown }[];
    [key: string]: unknown;
  }[] | null,
): ActivityWithParticipants[] {
  return (data ?? []).map((a) => ({
    ...(a as ActivityWithParticipants),
    host: normalizeRelation<ActivityHostSummary>(a.host),
    participants: a.participants.map((p) => ({
      ...p,
      profiles: normalizeRelation<ParticipantProfile>(p.profiles),
    })),
  }));
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

  return {
    ...data,
    participants: data.participants.map((p) => ({
      ...p,
      profiles: normalizeRelation<DetailParticipantProfile>(p.profiles),
    })),
    host,
    hosted_count: hostedCount ?? 0,
  };
}
