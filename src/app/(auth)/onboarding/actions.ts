'use server'

// 'use server' at the file level marks every export as a Server Action —
// they run on the server even when called from a client component form.
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createProfile(formData: FormData) {
  const supabase = await createClient()

  // Re-verify the session server-side; middleware protects the route but actions
  // should never trust that the caller is authenticated without checking themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Sports is a JSON-encoded array from the hidden input in the onboarding form
  const rawSports = formData.get('sports') as string
  const sports: string[] = rawSports ? JSON.parse(rawSports) : []

  const { error } = await supabase.from('profiles').insert({
    id: user.id, // profiles.id is a FK to auth.users — ties the profile to the auth account
    full_name: formData.get('full_name') as string,
    username: (formData.get('username') as string).replace(/^@/, ''), // strip leading @ if typed
    bio: formData.get('bio') as string,
    sports,
  })

  if (error) throw new Error(error.message)

  // redirect() throws a special Next.js error internally — don't wrap it in try/catch
  redirect('/')
}
