'use server'

import { createClient } from '@/lib/supabase/server'

const USERNAME_RE = /^[a-z0-9]{3,20}$/

export async function checkUsername(
  username: string,
): Promise<{ available: boolean }> {
  if (!USERNAME_RE.test(username)) return { available: false }

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  return { available: data === null }
}

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

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: full_name.trim(),
    username: username.trim(),
    bio: bio.trim() || null,
    instagram_handle: instagram_handle.replace(/^@/, '').trim() || null,
    sports,
  })

  if (error) return { error: error.message }
  return {}
}
