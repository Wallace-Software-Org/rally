-- Close profiles.lat/lng to anyone but the row's owner.
--
-- lat/lng exist only for the feed's server-side distance math and were never
-- meant to be visible to anyone but the profile's own owner, but the blanket
-- "Profiles are publicly readable" policy (using (true)) made them readable
-- by anyone with the publishable key, for every user, via a direct REST
-- call -- confirmed live during the security audit this migration follows
-- from. RLS can't close this on its own: row level security is row-level,
-- not column-level, and the rest of the row (name, avatar, bio, username,
-- sports, instagram_handle) is intentionally public, so restricting the
-- whole row to the owner would break public profile pages.
--
-- Column-level REVOKE closes lat/lng for every row at once, including the
-- owner's own -- Postgres column privileges are per-role, not per-row, so a
-- blanket revoke also blocks the one legitimate read (the signed-in viewer
-- reading their own coordinates to seed the feed's Distance pill).
-- get_my_coordinates() is that read path back in: it takes no argument,
-- keyed on auth.uid() internally the same way join_activity() is keyed on
-- it, so there is nothing to vary and no way to request another user's row.
--
-- Revoking from PUBLIC too, not just anon/authenticated: this project
-- manages grants on anon/authenticated directly rather than through PUBLIC,
-- so this is belt-and-suspenders, matching the pattern already used for
-- waiver_acceptances (revoking privileges outright, not just relying on
-- policy, so the column stays closed even if something is granted to PUBLIC
-- by mistake later). service_role is deliberately left untouched: it already
-- bypasses RLS for legitimate server-only admin work and its key never
-- reaches a browser, so revoking its own column access would be backwards,
-- not a hardening.

revoke select (lat, lng) on public.profiles from public;
revoke select (lat, lng) on public.profiles from anon;
revoke select (lat, lng) on public.profiles from authenticated;

create or replace function public.get_my_coordinates()
returns table (lat float8, lng float8)
language sql
stable
security definer
set search_path = public
as $$
  select p.lat, p.lng
    from public.profiles p
   where p.id = auth.uid()
$$;

-- Supabase auto-grants execute to anon and authenticated on new public-schema
-- functions, and `create or replace` preserves existing grants, so revoke
-- explicitly before granting: an anonymous caller has no profile row (its
-- auth.uid() is null, so the query would just return zero rows), so there is
-- no reason to grant it anon execute. authenticated is the only caller that
-- ever needs this.
revoke all on function public.get_my_coordinates() from public;
revoke execute on function public.get_my_coordinates() from anon;
grant execute on function public.get_my_coordinates() to authenticated;
