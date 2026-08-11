-- Transactional email notifications: per-user toggle + recipient lookup.
--
-- notification_emails is the single opt-out for the three transactional notices
-- (activity cancelled, someone joined, someone left). Default true so existing
-- users stay opted in; the edit-profile toggle flips it.
alter table public.profiles
  add column if not exists notification_emails boolean not null default true;

-- Recipient lookup for those emails. The address lives in auth.users while the
-- display name and toggle live in public.profiles, so this function is the only
-- thing in the app that reads auth.users: it lets the server actions address an
-- email without a service-role key in the app env.
--
-- SECURITY DEFINER so it can read auth.users regardless of RLS; it returns only
-- the three fields needed to address one message and takes the user id as its
-- single argument. Mirrors the join_activity() precedent: search_path pinned and
-- execute revoked from public.
--
-- Execute is granted to service_role only, NOT authenticated. User ids are
-- already visible to any signed-in user via participant lists, so an
-- authenticated grant would be a working email-enumeration path through the REST
-- API. The server actions therefore call this through a dedicated secret-key
-- client (see src/lib/email/), never the per-user publishable-key client.
create or replace function public.get_notification_recipient(p_user_id uuid)
returns table (
  email text,
  full_name text,
  notification_emails boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select u.email::text, p.full_name, p.notification_emails
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = p_user_id;
$$;

-- Supabase auto-grants execute to anon and authenticated on new public-schema
-- functions, and `create or replace` preserves existing grants, so revoke from
-- public is not enough: revoke those two roles explicitly before granting
-- service_role, or the enumeration path stays open on a fresh database.
revoke all on function public.get_notification_recipient(uuid) from public;
revoke execute on function public.get_notification_recipient(uuid) from anon;
revoke execute on function public.get_notification_recipient(uuid) from authenticated;
grant execute on function public.get_notification_recipient(uuid) to service_role;
