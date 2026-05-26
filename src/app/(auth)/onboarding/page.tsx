import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import OnboardingFlow from './onboarding-flow'

function toBaseUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)
}

async function findAvailableUsername(
  supabase: SupabaseClient,
  fullName: string,
): Promise<string> {
  const base = toBaseUsername(fullName)
  if (base.length < 3) return ''

  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', base)
    .maybeSingle()

  if (!taken) return base

  for (let i = 2; i <= 99; i++) {
    const suffix = String(i)
    const candidate = base.slice(0, 20 - suffix.length) + suffix
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle()
    if (!data) return candidate
  }

  return base
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const redirectTo =
    params.next ?? (params.activityId ? `/activity/${params.activityId}` : '/')

  const meta = user.user_metadata ?? {}
  const defaultName = (meta.full_name || meta.name || '') as string
  const defaultUsername = await findAvailableUsername(supabase, defaultName)

  return (
    <OnboardingFlow
      defaultName={defaultName}
      defaultUsername={defaultUsername}
      redirectTo={redirectTo}
    />
  )
}
