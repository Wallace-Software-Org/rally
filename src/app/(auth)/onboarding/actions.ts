'use server'

import { createClient } from '@/lib/supabase/server'

export async function createProfile({
  full_name,
  username,
  sports,
  bio,
  instagram_handle,
}: {
  full_name: string
  username: string
  sports: string[]
  bio: string
  instagram_handle: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: full_name.trim(),
    username: username.trim(),
    bio: bio.trim() || null,
    instagram_handle: instagram_handle.replace(/^@/, '').trim() || null,
    sports,
  }, { onConflict: 'id' })

  if (error) return { error: error.message }
  return {}
}
