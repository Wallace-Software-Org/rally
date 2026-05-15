import { createClient } from '@/lib/supabase/server'
import { getActivities } from '@/lib/queries/activities'
import ActivityFeed from '@/components/activities/activity-feed'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [activities, { data: profile }] = await Promise.all([
    getActivities(),
    user
      ? supabase
          .from('profiles')
          .select('avatar_url, full_name, city')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  return (
    <ActivityFeed
      activities={activities}
      profile={profile ?? null}
      userId={user?.id ?? null}
    />
  )
}
