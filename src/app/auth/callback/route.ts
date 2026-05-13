// OAuth redirect target — Google sends the user back here with ?code=... after they approve access.
// This is the second leg of the PKCE flow: we swap the one-time code for access + refresh tokens.
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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

        if (!profile) {
          return NextResponse.redirect(new URL('/onboarding', origin))
        }
      }

      return NextResponse.redirect(new URL('/', origin))
    }
  }

  // Code missing or exchange failed — send back to login with an error flag
  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
