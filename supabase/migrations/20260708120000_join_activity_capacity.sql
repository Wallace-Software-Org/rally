-- Atomic join with server-side capacity enforcement.
--
-- PostgREST can't count participants and insert in one atomic step, so joins at
-- the cap could race past max_participants. This function locks the activity row
-- (FOR UPDATE) to serialize concurrent joins for that activity, checks status
-- and capacity, then inserts. It returns a status string the server action maps
-- to a user-facing error.
--
-- SECURITY DEFINER so it can take the row lock and count regardless of RLS; the
-- inserted user_id is always auth.uid(), never a caller-supplied value. The
-- unique (activity_id, user_id) constraint (see schema.sql) makes re-joins a
-- no-op via ON CONFLICT.
create or replace function public.join_activity(p_activity_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_max int;
  v_count int;
begin
  if v_uid is null then
    return 'unauthenticated';
  end if;

  select status, max_participants
    into v_status, v_max
    from public.activities
   where id = p_activity_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if v_status <> 'open' then
    return 'closed';
  end if;

  if v_max is not null then
    select count(*)
      into v_count
      from public.participants
     where activity_id = p_activity_id;

    if v_count >= v_max then
      return 'full';
    end if;
  end if;

  insert into public.participants (activity_id, user_id, status)
  values (p_activity_id, v_uid, 'joined')
  on conflict (activity_id, user_id) do nothing;

  return 'ok';
end;
$$;

revoke all on function public.join_activity(uuid) from public;
grant execute on function public.join_activity(uuid) to authenticated;
