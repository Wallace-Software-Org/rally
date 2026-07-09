import { createClient } from "@/lib/supabase/server";

// Shared auth gate for server actions. Creates the server Supabase client and
// validates the session (getUser hits the auth server, not just the cookie).
// Returns { supabase, user, error }: on failure user is null and error is set,
// so callers do `if (error) return { error }` and then use user/supabase.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Not authenticated" as const };
  }

  return { supabase, user, error: null };
}
