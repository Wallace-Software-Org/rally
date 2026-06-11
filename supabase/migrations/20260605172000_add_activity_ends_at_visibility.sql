alter table public.activities
  add column if not exists ends_at timestamptz,
  add column if not exists visibility text not null default 'public';

alter table public.activities
  drop constraint if exists activities_visibility_check;

alter table public.activities
  add constraint activities_visibility_check
  check (visibility in ('public', 'private'));
