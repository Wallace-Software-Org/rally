// Runs on every request before the page renders (Node.js runtime in Next.js 16+)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Everything not in this list requires a valid session
const PUBLIC_PATHS = ['/login', '/auth', '/']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  // Start with a passthrough response; may be replaced inside setAll if cookies change
  let response = NextResponse.next({ request })

  // Build a Supabase client that reads/writes cookies on the edge request/response pair
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // Called when Supabase refreshes the access token mid-request.
        // Must write to both request (so downstream server code sees it) and response (so the
        // browser receives the new cookie). Also forwards Cache-Control headers so CDNs don't
        // cache a response that contains a Set-Cookie.
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // Proxy must only do optimistic checks (cookie read, no network call) — see Next.js auth docs.
  // getUser() hits the Supabase auth server on every request, which causes request pile-up under
  // prefetch load and exhausts memory. Real JWT validation belongs in server components / route handlers.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
