import { createClient } from '@/lib/supabase/server'
import type { ActivityWithParticipants } from '@/types'

export async function getActivities(): Promise<ActivityWithParticipants[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('activities')
    .select(`
      id, title, sport, location_name, starts_at,
      max_participants, skill_level, lat, lng,
      participants ( id, user_id, profiles ( full_name, avatar_url ) )
    `)
    .eq('status', 'open')
    .gt('starts_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true })

  // Supabase without generated types infers many-to-one joins as arrays at the type level
  // but they are objects at runtime. Normalize here so the Participant type matches.
  return (data ?? []).map(a => ({
    ...a,
    participants: a.participants.map(p => ({
      ...p,
      profiles: (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) ?? null,
    })),
  }))
}
