-- get_activity_for_viewer() let an invite-link viewer who hasn't joined yet
-- resolve a private activity by id, but participants had no equivalent: its
-- policy (restrict_participants_visibility) is creator/participant/public
-- only, with no id-is-the-credential exception. So that same viewer saw the
-- activity but an empty participant list and a wrong spots-left count --
-- confirmed by a test that pinned the empty list as current behavior,
-- updated alongside this migration to expect the real one.
--
-- get_participants_for_viewer() closes that gap the same way
-- get_activity_for_viewer() does: SECURITY DEFINER, keyed on the activity id
-- alone, no auth.uid() check inside at all. It intentionally returns the
-- rows to anyone who supplies the id, signed in or not, public or private --
-- knowing the id is the credential, same reasoning as the activities
-- function, not a weaker version of it. It takes exactly one uuid and
-- returns that one activity's participant rows -- no filter parameter, no
-- list parameter, nothing that admits a wider WHERE clause. Returns only
-- (id, user_id), not an embedded profiles relation: profile fields are
-- fetched separately in application code (profiles' own policy is
-- unrestricted for these columns, see restrict_profile_coordinates), the
-- same way get_activity_for_viewer's caller fetches the host profile
-- separately rather than relying on PostgREST's relation embedding through
-- an RPC call, which is not dependable the way embedding on a plain
-- table/view select is.
create or replace function public.get_participants_for_viewer(p_activity_id uuid)
returns table (
  id uuid,
  user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.user_id
    from public.participants p
   where p.activity_id = p_activity_id
$$;

-- Supabase auto-grants execute to anon and authenticated on new public-schema
-- functions, and `create or replace` preserves existing grants, so revoke
-- explicitly before granting back. Both are needed: getActivityById calls
-- this for every detail-page viewer, anonymous included (a public activity's
-- avatar strip for a signed-out visitor), and notify.ts calls it from
-- server actions, always as some authenticated user.
revoke all on function public.get_participants_for_viewer(uuid) from public;
revoke execute on function public.get_participants_for_viewer(uuid) from anon;
revoke execute on function public.get_participants_for_viewer(uuid) from authenticated;
grant execute on function public.get_participants_for_viewer(uuid) to anon;
grant execute on function public.get_participants_for_viewer(uuid) to authenticated;
