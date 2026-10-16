import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActivities } from '@/lib/queries/activities'
import { hasAcceptedWaiver } from '@/lib/queries/waivers'
import ActivityFeed from '@/components/activities/activity-feed'

// profiles.lat/lng are column-restricted to the row's own owner (see
// supabase/migrations/20261015120000_restrict_profile_coordinates.sql) — a
// plain select can no longer read them, even for your own row, because
// Postgres column privileges are per-role, not per-row. get_my_coordinates()
// is the read path back in, keyed on the caller's session.
//
// That migration hasn't been applied yet (schema changes are applied
// manually, staging then prod — see CLAUDE.md), so the function isn't in the
// generated types yet and `supabase.rpc(...)` can't be typed against it
// normally. Cast narrowly here; once the migration lands and
// `npx supabase gen types` is re-run, delete this function and inline a
// plain `supabase.rpc("get_my_coordinates")` call instead.
async function getMyCoordinates(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ lat: number; lng: number } | null> {
  const { data } = await (
    supabase.rpc as unknown as (
      fn: 'get_my_coordinates',
    ) => PromiseLike<{ data: { lat: number; lng: number }[] | null }>
  )('get_my_coordinates')
  return data?.[0] ?? null
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [activities, sportsResult, coords, participantWaiverAccepted] = await Promise.all([
    getActivities(),
    user
      ? supabase
          .from('profiles')
          .select('sports')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
    user ? getMyCoordinates(supabase) : Promise.resolve(null),
    user ? hasAcceptedWaiver(supabase, user.id, 'participant') : Promise.resolve(false),
  ])

  // ActivityFeed reads useSearchParams to seed its filter/view state. Wrap it in
  // Suspense at the narrowest point so the build never warns and any future
  // static optimization of this page won't bail on the whole tree.
  return (
    <Suspense>
      <ActivityFeed
        activities={activities}
        userId={user?.id ?? null}
        participantWaiverAccepted={participantWaiverAccepted}
        userActivities={(sportsResult.data?.sports as string[]) ?? []}
        profileLat={coords?.lat ?? null}
        profileLng={coords?.lng ?? null}
      />
    </Suspense>
  )
}
