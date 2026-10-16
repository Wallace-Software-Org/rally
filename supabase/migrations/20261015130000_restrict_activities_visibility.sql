-- Replace activities' blanket "readable by anyone" policy with one that
-- actually enforces "private" at the database layer. Confirmed live during
-- the security audit this migration follows from: with the old
-- `using (true)` policy, anyone with the publishable key could list every
-- private activity -- title, exact coordinates, start time -- via a direct
-- REST call with no auth, no filter beyond visibility=eq.private. The app's
-- own gating (getActivityById's anonymous-only check, getActivities'
-- visibility filter) was real but was never a security boundary, since
-- nothing stopped a caller from skipping the app and querying the table
-- directly.
--
-- New policy: public rows stay visible to everyone, including anonymous.
-- Private rows are visible only to their creator and to current
-- participants -- the two groups who are supposed to already know the
-- activity exists.
drop policy if exists "Activities are publicly readable" on public.activities;

create policy "Activities are visible to everyone if public, else to creator and participants"
  on public.activities for select
  using (
    visibility = 'public'
    or auth.uid() = creator_id
    or exists (
      select 1
        from public.participants p
       where p.activity_id = activities.id
         and p.user_id = auth.uid()
    )
  );

-- This closes enumeration but breaks the invite-link flow: someone who has a
-- private activity's link but hasn't joined yet is neither the creator nor a
-- participant, so the policy above correctly hides the row from a plain
-- select -- but they still need to be able to read it once, to decide
-- whether to join. get_activity_for_viewer() is that path: SECURITY DEFINER,
-- keyed on the activity id alone, no auth.uid() check inside it at all. It
-- intentionally returns the row to anyone who supplies the id, signed in or
-- not, public or private -- knowing the id is the credential, the same way
-- the app already treats "unlisted" (see getActivityById's own comment:
-- "any authenticated user who has the direct link can view and join"). The
-- application layer, not this function, decides what an anonymous caller
-- gets to see with that data; this function's only job is closing the
-- *enumeration* path, not re-implementing the app's visibility UX.
--
-- It takes exactly one uuid and returns at most one row -- no filter
-- parameter, no list parameter, nothing that admits a WHERE clause wider
-- than "this one id." A v4 UUID has 122 bits of randomness; a function
-- shaped like this cannot be used to enumerate the table the way the old
-- policy could.
create or replace function public.get_activity_for_viewer(p_activity_id uuid)
returns table (
  id uuid,
  title text,
  sport text,
  description text,
  external_link text,
  location_name text,
  starts_at timestamptz,
  max_participants int,
  skill_level text,
  lat float8,
  lng float8,
  status text,
  creator_id uuid,
  visibility text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.title, a.sport, a.description, a.external_link,
         a.location_name, a.starts_at, a.max_participants, a.skill_level,
         a.lat, a.lng, a.status, a.creator_id, a.visibility
    from public.activities a
   where a.id = p_activity_id
$$;

-- Supabase auto-grants execute to anon and authenticated on new public-schema
-- functions, and `create or replace` preserves existing grants, so revoke
-- explicitly before granting back: both anon and authenticated need this one
-- (an anonymous visitor with a private link still needs to resolve the row
-- once, to get the "this is private, log in" gate instead of a raw 404 --
-- see getActivityById), unlike get_my_coordinates, which only ever has a
-- caller-identity answer for someone signed in.
revoke all on function public.get_activity_for_viewer(uuid) from public;
revoke execute on function public.get_activity_for_viewer(uuid) from anon;
revoke execute on function public.get_activity_for_viewer(uuid) from authenticated;
grant execute on function public.get_activity_for_viewer(uuid) to anon;
grant execute on function public.get_activity_for_viewer(uuid) to authenticated;
