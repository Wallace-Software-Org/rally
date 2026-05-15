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
