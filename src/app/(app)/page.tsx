// Server Component (no 'use client') — renders on the server, has direct access to cookies/session
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  // getUser() is preferred over getSession() here: it validates the JWT with Supabase Auth,
  // whereas getSession() only decodes the cookie locally without a server round-trip.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Signed in as{' '}
        <span className="font-semibold text-zinc-900 dark:text-white">{user?.email}</span>
      </p>
    </main>
  )
}
