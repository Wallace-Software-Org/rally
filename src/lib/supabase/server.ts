// Server-only Supabase client — used in Server Components, Route Handlers, and Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// async because Next.js 15+ made cookies() asynchronous
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase calls getAll to read the current session from the request cookies
        getAll() {
          return cookieStore.getAll()
        },
        // Supabase calls setAll when it refreshes a token; writes the updated cookies to the response
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
          // headers contain Cache-Control directives — not needed here, middleware handles them
          void headers
        },
      },
    }
  )
}
