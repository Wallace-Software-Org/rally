-- Liability waiver audit trail.
--
-- One row per (user, waiver type, version) the user has accepted. The app treats
-- a waiver as accepted when a row exists with version >= the current version in
-- src/lib/waivers.ts, so raising that version makes everyone re-accept on their
-- next join or post. Rows keep the exact text that was shown (waiver_text), the
-- typed initials, and the request's IP and user agent as evidence.
--
-- Append-only and server-trusted: a signed-in user can only read their own rows.
-- No client role can insert, update, or delete. Rows are written solely by the
-- acceptWaiver server action through the service_role client, which takes the
-- waiver text and version from src/lib/waivers.ts and the user id from the
-- verified session, so the stored evidence cannot be forged from the browser.
-- waiver_type is text + a check constraint, not a Postgres enum (enums are
-- painful to alter).
create table public.waiver_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete restrict,
  waiver_type text not null check (waiver_type in ('participant', 'host')),
  version     integer not null,
  initials    text not null,
  waiver_text text not null,
  ip_address  text,
  user_agent  text,
  accepted_at timestamptz not null default now(),
  unique (user_id, waiver_type, version)
);

alter table public.waiver_acceptances enable row level security;

create policy "Users can read their own waiver acceptances"
  on public.waiver_acceptances for select
  to authenticated
  using (auth.uid() = user_id);

-- Supabase auto-grants full table privileges to anon and authenticated on new
-- public-schema tables, so remove them explicitly instead of relying on policies
-- alone: with no insert, update, or delete policy RLS already denies those
-- statements, and revoking the privileges makes that hold even if a policy is
-- added by mistake later. authenticated keeps select (own rows, via the policy
-- above). service_role bypasses RLS and is the only writer. Profiles with waiver
-- rows cannot be deleted (on delete restrict), so acceptance evidence survives
-- account removal.
revoke all on public.waiver_acceptances from anon;
revoke insert, update, delete, truncate on public.waiver_acceptances from authenticated;
grant select, insert on public.waiver_acceptances to service_role;
