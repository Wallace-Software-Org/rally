-- Schema hardening. The app treats these columns as always-present invariants,
-- but the original schema left them nullable, which forced nullability
-- narrowings in the query layer once generated types landed. The types audit
-- confirmed zero existing nulls on staging and prod, so the missing NOT NULL
-- constraints are safe to add. activities.status also gains a check constraint
-- restricting it to the two values the app uses.
--
-- visibility and status are kept as text + check constraints on purpose (not
-- Postgres enums): enums are painful to alter later and the check constraints
-- fully cover the invariant. Generated types therefore keep plain string for
-- both; the toVisibility() helper (src/lib/utils/visibility.ts) bridges the DB
-- string to the domain Visibility union at the query boundary.
--
-- SET NOT NULL is a no-op when the column is already NOT NULL, and the status
-- check is dropped-if-exists before being re-added, so this migration is safe to
-- re-run.

alter table public.activities
  alter column creator_id set not null,
  alter column location_name set not null;

alter table public.participants
  alter column user_id set not null,
  alter column activity_id set not null;

alter table public.profiles
  alter column username set not null;

-- activities.status: enforce presence, keep the 'open' default, and restrict to
-- the two statuses the app uses.
alter table public.activities
  alter column status set not null,
  alter column status set default 'open';

alter table public.activities
  drop constraint if exists activities_status_check;

alter table public.activities
  add constraint activities_status_check
  check (status in ('open', 'cancelled'));
