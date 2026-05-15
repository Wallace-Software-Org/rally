import { createClient } from '@/lib/supabase/server'
import Feed from '@/components/activities/Feed'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: activities }, { data: profile }] = await Promise.all([
    supabase
      .from('activities')
      .select(`
        id, title, sport, location_name, starts_at,
        max_participants, skill_level, lat, lng,
        participants ( id, user_id, profiles ( full_name, avatar_url ) )
      `)
      .eq('status', 'open')
      .gt('starts_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true }),
    user
      ? supabase
          .from('profiles')
          .select('avatar_url, full_name, city')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  // Supabase without generated types infers all embedded joins as arrays, but
  // many-to-one joins (participants.user_id → profiles.id) are objects at runtime.
  // Normalize here so Feed's Participant type matches the actual runtime shape.
  const normalizedActivities = (activities ?? []).map(a => ({
    ...a,
    participants: a.participants.map(p => ({
      ...p,
      profiles: (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) ?? null,
    })),
  }))

  return (
    <Feed
      activities={normalizedActivities}
      profile={profile ?? null}
      userId={user?.id ?? null}
    />
  )
}
