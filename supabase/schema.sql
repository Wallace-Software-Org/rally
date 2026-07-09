-- profiles
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  username    text unique,
  full_name   text,
  avatar_url  text,
  bio         text,
  lat         float8,
  lng         float8,
  city        text,
  sports            text[],
  instagram_handle  text,
  created_at        timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- activities
create table public.activities (
  id               uuid default gen_random_uuid() primary key,
  creator_id       uuid references public.profiles on delete cascade,
  title            text not null,
  sport            text not null,
  description      text,
  external_link    text,
  lat              float8,
  lng              float8,
  location_name    text,
  starts_at        timestamptz not null,
  max_participants int default 10,
  skill_level      text default 'all',
  status           text default 'open',
  community_tag    text,
  created_at       timestamptz default now()
);

alter table public.activities enable row level security;

create policy "Activities are publicly readable"
  on public.activities for select
  using (true);

create policy "Authenticated users can create activities"
  on public.activities for insert
  with check (auth.uid() is not null);

create policy "Creators can update their own activities"
  on public.activities for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their own activities"
  on public.activities for delete
  using (auth.uid() = creator_id);

-- participants
create table public.participants (
  id          uuid default gen_random_uuid() primary key,
  activity_id uuid references public.activities on delete cascade,
  user_id     uuid references public.profiles on delete cascade,
  status      text default 'confirmed',
  joined_at   timestamptz default now(),
  unique (activity_id, user_id)
);

alter table public.participants enable row level security;

create policy "Participants are publicly readable"
  on public.participants for select
  using (true);

create policy "Authenticated users can join activities"
  on public.participants for insert
  with check (auth.uid() = user_id);

create policy "Users can remove themselves from activities"
  on public.participants for delete
  using (auth.uid() = user_id);

-- Atomic join with capacity enforcement (see migration
-- 20260708120000_join_activity_capacity.sql for rationale).
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
