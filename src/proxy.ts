// Runs on every request before the page renders (Node.js runtime in Next.js 16+)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Everything not in this list requires a valid session.
// opengraph-image and manifest.webmanifest are Next.js metadata routes: they
// serve with no file extension in the URL, so the matcher's extension-based
// static-file exclusion below doesn't catch them. Without this they 307 to
// /login for anonymous requests, breaking link-preview crawlers and PWA installs.
const PUBLIC_PATHS = [
  '/login',
  '/auth',
  '/',
  '/activity',
  '/waiver',
  '/opengraph-image',
  '/manifest.webmanifest',
]

// The per-activity share card feeds the detail page's og:image, so crawlers
// (never authenticated) must be able to fetch it for public activities. The
// route itself still 404s a private activity for an anonymous caller — this
// just lets the request reach that check instead of dying at the login wall
// first. Scoped to the exact /card leaf, not all of /api/activity, so any
// future endpoint under that prefix stays behind auth by default.
const CARD_ROUTE_RE = /^\/api\/activity\/[^/]+\/card$/

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    CARD_ROUTE_RE.test(pathname)
  )
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

  // getUser() validates the JWT against the Supabase auth server and refreshes the access token
  // when it has expired. The refresh writes new cookies via setAll above — and middleware/proxy is
  // the one place that write is allowed, so doing it here keeps Server Components from attempting
  // (and failing) the same cookie write during render.
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
