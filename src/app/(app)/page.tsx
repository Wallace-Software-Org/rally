import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-2 bg-white dark:bg-zinc-950">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Welcome to Rally
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Signed in as{' '}
        <span className="font-semibold text-zinc-900 dark:text-white">{user?.email}</span>
      </p>
    </main>
  )
}
