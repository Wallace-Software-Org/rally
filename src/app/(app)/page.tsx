import { createClient } from '@/lib/supabase/server'
import { getActivities } from '@/lib/queries/activities'
import ActivityFeed from '@/components/activities/activity-feed'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [activities, profileResult] = await Promise.all([
    getActivities(),
    user
      ? supabase
          .from('profiles')
          .select('sports, lat, lng')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <ActivityFeed
      activities={activities}
      userId={user?.id ?? null}
      userActivities={(profileResult.data?.sports as string[]) ?? []}
      profileLat={(profileResult.data?.lat as number | null) ?? null}
      profileLng={(profileResult.data?.lng as number | null) ?? null}
    />
  )
}
