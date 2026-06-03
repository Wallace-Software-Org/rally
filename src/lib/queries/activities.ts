import { createClient } from "@/lib/supabase/server";
import type { ActivityWithParticipants, ActivityDetail } from "@/types";

export async function getActivities(): Promise<ActivityWithParticipants[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select(
      `
      id, creator_id, title, sport, external_link, location_name, starts_at,
      max_participants, skill_level, lat, lng,
      participants ( id, user_id, profiles ( full_name, avatar_url ) )
    `,
    )
    .eq("status", "open")
    .gt("starts_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()) // Arizona is UTC-7 (no DST); 3h buffer keeps local-time activities visible
    .order("starts_at", { ascending: true });

  // Supabase without generated types infers many-to-one joins as arrays at the type level
  // but they are objects at runtime. Normalize here so the Participant type matches.
  return (data ?? []).map((a) => ({
    ...a,
    participants: a.participants.map((p) => ({
      ...p,
      profiles:
        (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) ?? null,
    })),
  }));
}

export async function getActivityById(id: string): Promise<ActivityDetail | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select(
      `
      id, title, sport, description, external_link, location_name, starts_at,
      max_participants, skill_level, lat, lng, status, creator_id,
      participants (
        id, user_id,
        profiles ( full_name, avatar_url, instagram_handle, username )
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!data) return null;

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
      profiles:
        (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) ?? null,
    })),
    host,
    hosted_count: hostedCount ?? 0,
  };
}
