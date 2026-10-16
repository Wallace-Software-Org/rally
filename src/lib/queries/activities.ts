import { createClient } from "@/lib/supabase/server";
import type {
  ActivityDetail,
  ActivityHostSummary,
  ActivityWithParticipants,
  DetailParticipantProfile,
  ParticipantProfile,
} from "@/types";
import type { Database } from "@/types/supabase";
import { toVisibility } from "@/lib/utils/visibility";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];

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
  participants: (Pick<ParticipantRow, "id" | "user_id"> & {
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  })[];
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
// toVisibility bridges the DB's plain visibility string to the domain union; the
// NOT NULL constraints make everything else line up without an assertion.
function normalize(data: FeedActivityRow[] | null): ActivityWithParticipants[] {
  return (data ?? []).map((a) => ({
    ...a,
    visibility: toVisibility(a.visibility),
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

// Row shape returned by get_activity_for_viewer() (see the
// restrict_activities_visibility migration). Not yet in the generated types:
// that migration hasn't been applied (schema changes are applied manually,
// staging then prod), so the cast below is temporary — once applied and
// `npx supabase gen types` is re-run, this type and the cast can go and the
// call becomes a plain `supabase.rpc("get_activity_for_viewer", ...)`.
type ActivityCoreRow = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  external_link: string | null;
  location_name: string;
  starts_at: string | null;
  max_participants: number | null;
  skill_level: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  creator_id: string;
  visibility: string;
};

export async function getActivityById(
  id: string,
  requesterId: string | null = null,
): Promise<ActivityDetail | "private" | null> {
  const supabase = await createClient();

  // The activities table policy now hides a private row from anyone but its
  // creator and current participants (see restrict_activities_visibility),
  // so a plain select here would 404 an anonymous visitor with a private
  // link instead of showing the "this is private, log in" gate below.
  // get_activity_for_viewer() is keyed on the id alone — the application,
  // not the function, still decides what an anonymous caller sees with it.
  const [{ data: rows }, { data: participantRows }] = await Promise.all([
    (
      supabase.rpc as unknown as (
        fn: "get_activity_for_viewer",
        args: { p_activity_id: string },
      ) => PromiseLike<{ data: ActivityCoreRow[] | null }>
    )("get_activity_for_viewer", { p_activity_id: id }),
    supabase
      .from("participants")
      .select(
        "id, user_id, profiles ( full_name, avatar_url, instagram_handle, username )",
      )
      .eq("activity_id", id),
  ]);

  const data = rows?.[0] ?? null;
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

  // hosted_count now reflects what this specific viewer is allowed to see
  // under the new activities policy, not the host's true total: a viewer who
  // is neither the host nor a participant on the host's OTHER private
  // activities no longer sees those counted. That is a deliberate side
  // effect of closing the visibility gap, not a bug — a public tally that
  // included hidden private activities would itself leak their existence.
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

  // toVisibility bridges the DB's plain visibility string to the domain union.
  // host.full_name stays nullable (see HostProfile) and is handled at render.
  return {
    ...data,
    visibility: toVisibility(data.visibility),
    participants: (participantRows ?? []).map((p) => ({
      ...p,
      profiles: normalizeRelation<DetailParticipantProfile>(p.profiles),
    })),
    host,
    hosted_count: hostedCount ?? 0,
  };
}
