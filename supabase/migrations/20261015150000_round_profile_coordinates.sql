-- One-time cleanup to match the rounding updateUserLocation now applies
-- before every write (src/lib/actions/profiles.ts): existing rows were
-- written at full GPS precision before this fix and are not touched by it
-- retroactively, so they're rounded here. Safe to re-run — rounding an
-- already-rounded value is a no-op.
update public.profiles
   set lat = round(lat::numeric, 2),
       lng = round(lng::numeric, 2)
 where lat is not null
    or lng is not null;
