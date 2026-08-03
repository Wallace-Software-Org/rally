// Server-only Supabase client — used in Server Components, Route Handlers, and Server Actions
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

// async because Next.js 15+ made cookies() asynchronous
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase calls getAll to read the current session from the request cookies
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase calls setAll when it refreshes a token; writes the updated cookies to the response.
        // sameSite: 'lax' is required — 'strict' blocks Safari from receiving cookies on cross-site
        // OAuth redirects (Google → your domain), which silently breaks the PKCE code exchange.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, sameSite: "lax" }),
            );
          } catch {
            // Called from a Server Component render, where cookies cannot be written.
            // Safe to ignore: proxy.ts refreshes the session and writes cookies on every
            // request, so the refreshed token is already persisted there.
          }
        },
      },
    },
  );
}
