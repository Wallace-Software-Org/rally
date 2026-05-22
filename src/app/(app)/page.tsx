import { createClient } from '@/lib/supabase/server'
import { getActivities } from '@/lib/queries/activities'
import ActivityFeed from '@/components/activities/activity-feed'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const activities = await getActivities()

  return (
    <ActivityFeed
      activities={activities}
      userId={user?.id ?? null}
    />
  )
}
