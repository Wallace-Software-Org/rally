// OAuth redirect target — Google sends the user back here with ?code=... after they approve access.
// This is the second leg of the PKCE flow: we swap the one-time code for access + refresh tokens.
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const join = searchParams.get('join')

  if (code) {
    const supabase = await createClient()

    // Exchanges the code for a session; sets the auth cookies on the response via setAll
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Re-fetch the verified user after the session is established
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check whether this user has already completed onboarding
        // maybeSingle() returns null (not an error) when no row is found
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        const isQuickJoin = join === 'true' && typeof next === 'string' && next.startsWith('/activity/')

        if (!profile) {
          if (isQuickJoin) {
            // New user via quick-join: create a minimal profile and skip the onboarding flow.
            // Username: display name lowercased, spaces to hyphens, plus a 4-digit suffix.
            const displayName: string =
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              'user'
            const base = displayName
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '')
            const suffix = Math.floor(1000 + Math.random() * 9000)
            await supabase.from('profiles').insert({
              id: user.id,
              full_name: displayName,
              username: `${base}${suffix}`,
            })
            return NextResponse.redirect(new URL(`${next}?join=true`, origin))
          }
          return NextResponse.redirect(new URL('/onboarding', origin))
        }

        if (isQuickJoin) {
          return NextResponse.redirect(new URL(`${next}?join=true`, origin))
        }
      }

      return NextResponse.redirect(new URL('/', origin))
    }
  }

  // Code missing or exchange failed — send back to login with an error flag
  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
