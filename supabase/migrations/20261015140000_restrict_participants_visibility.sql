-- Replace participants' blanket "readable by anyone" policy, closing the
-- last of the three enumeration gaps found in the security audit this
-- migration follows from: anyone with the publishable key could list every
-- participant row for every activity, public or private -- full attendance
-- history, cross-referenceable against public profile names, via a direct
-- REST call with no auth and no id needed at all.
--
-- A direct policy referencing activities (whose own policy, from
-- restrict_activities_visibility, references participants back) would be a
-- circular RLS reference across two tables: Postgres detects this and aborts
-- with "infinite recursion detected in policy" rather than just running
-- slowly. can_view_activity() is a SECURITY DEFINER circuit breaker: its
-- internal queries run with the function owner's privileges and so never
-- re-trigger either table's RLS policy, which is what breaks the cycle.
-- Realtime's postgres_changes still works normally against the policy below
-- -- it only needs a genuine row-filtering USING clause to evaluate per
-- subscriber, and doesn't care that the clause happens to call a function
-- internally. What *would* break realtime is removing the table policy
-- entirely in favor of a function-only read path (no policy left for
-- Realtime to evaluate against at all) -- that is a different, more
-- aggressive shape of fix than this one, and is not what this migration does.
create or replace function public.can_view_activity(p_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.activities a
     where a.id = p_activity_id
       and (
         a.visibility = 'public'
         or a.creator_id = auth.uid()
         or exists (
           select 1
             from public.participants p
            where p.activity_id = a.id
              and p.user_id = auth.uid()
         )
       )
  )
$$;

-- Supabase auto-grants execute to anon and authenticated on new public-schema
-- functions, and `create or replace` preserves existing grants, so revoke
-- explicitly before granting back. Both anon and authenticated need this one:
-- an anonymous viewer on a public activity still needs the policy below to
-- evaluate true for them (the avatar strip on a public detail page), the
-- same reasoning already applied to get_activity_for_viewer().
revoke all on function public.can_view_activity(uuid) from public;
revoke execute on function public.can_view_activity(uuid) from anon;
revoke execute on function public.can_view_activity(uuid) from authenticated;
grant execute on function public.can_view_activity(uuid) to anon;
grant execute on function public.can_view_activity(uuid) to authenticated;

-- The insert policy ("Authenticated users can join activities", with check
-- (auth.uid() = user_id)) is untouched by this migration -- only the select
-- policy changes. Every participants write path (join_activity()'s own
-- insert, which is itself SECURITY DEFINER and so bypasses RLS entirely;
-- leaveActivity's delete; createActivity's host auto-join insert) is
-- unaffected either way, since none of them are selects.
drop policy if exists "Participants are publicly readable" on public.participants;

create policy "Participants are visible to whoever can view the activity"
  on public.participants for select
  using (public.can_view_activity(activity_id));

-- REPLICA IDENTITY FULL has been applied live on staging and prod (per
-- CLAUDE.md) so DELETE events carry activity_id, but was never captured in a
-- migration -- adding it here so the schema is reproducible from this
-- directory alone. Setting an already-matching replica identity is a
-- lightweight catalog-only change with no table rewrite, so this is already
-- a safe no-op to re-run; it does not need a conditional guard.
alter table public.participants replica identity full;
