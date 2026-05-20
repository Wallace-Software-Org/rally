-- supabase/seed.sql
-- Rally development seed data
-- Run in Supabase SQL Editor (requires postgres role — the default in Supabase's SQL editor)
--
-- KEEP SEED DATES CURRENT: all starts_at values use dynamic date expressions so this
-- script stays valid whenever it is re-run. Never hardcode absolute timestamps here.
--
-- user-1 (wallace@wallace.software) is NOT seeded here.
-- That profile was created via real onboarding and already exists.
--
-- Dates use dynamic expressions so the data stays valid whenever this is re-run:
--   date_trunc('week', current_date)  →  Monday of the current ISO week (Postgres default)
--   + 2 days                          →  Wednesday  (mid-week, tests "This week" filter distinctly)
--   + 5 days                          →  Saturday
--   + 6 days                          →  Sunday
--   + 7 days                          →  next Monday
-- Times are Arizona local (MST, UTC-7, no DST) via AT TIME ZONE 'America/Phoenix'.

-- ─── Bypass FK from profiles.id → auth.users for seed rows ───────────────────
-- Restoring to DEFAULT at the end of the script.
SET session_replication_role = replica;

-- ─── Profiles (users 2–4) ─────────────────────────────────────────────────────

INSERT INTO public.profiles (id, username, full_name, sports, city, instagram_handle)
VALUES
  (
    '00000000-0000-0000-0000-000000000002',
    'jkline', 'Jake Kline',
    ARRAY['pickleball', 'running'],
    'Gilbert', 'jakekline'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'mrivera', 'Maria Rivera',
    ARRAY['hiking', 'gym'],
    'Tempe', 'mariar'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'tlopez', 'Tom Lopez',
    ARRAY['boxing', 'paddleboard'],
    'Chandler', null
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Activities ───────────────────────────────────────────────────────────────

INSERT INTO public.activities (
  id,
  creator_id,
  sport,
  title,
  location_name,
  lat,
  lng,
  starts_at,
  max_participants,
  skill_level,
  status
)
VALUES

  -- act-1 │ today 7:00am │ pickleball │ Jake
  (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'pickleball',
    'Morning doubles at Chaparral',
    'Chaparral Park',
    33.5722, -111.9260,
    (current_date::timestamp + interval '7 hours') AT TIME ZONE 'America/Phoenix',
    4, 'all', 'open'
  ),

  -- act-2 │ this Saturday 6:30am │ running │ Jake
  (
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'running',
    'South Mountain trail run',
    'South Mountain Park',
    33.3700, -112.0200,
    (date_trunc('week', current_date)::timestamp + interval '5 days 6 hours 30 minutes') AT TIME ZONE 'America/Phoenix',
    10, 'intermediate', 'open'
  ),

  -- act-3 │ this Saturday 9:00am │ boxing │ Tom
  (
    '00000000-0000-0000-0001-000000000003',
    '00000000-0000-0000-0000-000000000004',
    'boxing',
    'Sparring session — all welcome',
    'Title Boxing Scottsdale',
    33.4942, -111.9261,
    (date_trunc('week', current_date)::timestamp + interval '5 days 9 hours') AT TIME ZONE 'America/Phoenix',
    8, 'beginner', 'open'
  ),

  -- act-4 │ this Sunday 7:00am │ hiking │ Maria
  (
    '00000000-0000-0000-0001-000000000004',
    '00000000-0000-0000-0000-000000000003',
    'hiking',
    'Camelback summit push',
    'Camelback Mountain',
    33.5200, -111.9745,
    (date_trunc('week', current_date)::timestamp + interval '6 days 7 hours') AT TIME ZONE 'America/Phoenix',
    6, 'all', 'open'
  ),

  -- act-5 │ this Sunday 8:00am │ pickleball │ Jake │ status=full
  (
    '00000000-0000-0000-0001-000000000005',
    '00000000-0000-0000-0000-000000000002',
    'pickleball',
    'Competitive drill session',
    'Chaparral Park',
    33.5722, -111.9260,
    (date_trunc('week', current_date)::timestamp + interval '6 days 8 hours') AT TIME ZONE 'America/Phoenix',
    4, 'advanced', 'full'
  ),

  -- act-6 │ next Monday 6:00am │ gym │ real user (wallace)
  (
    '00000000-0000-0000-0001-000000000006',
    (SELECT id FROM public.profiles WHERE username = 'wallace'),
    'gym',
    'Push day — anyone in?',
    'EōS Fitness Scottsdale',
    33.4989, -111.9263,
    (date_trunc('week', current_date)::timestamp + interval '7 days 6 hours') AT TIME ZONE 'America/Phoenix',
    3, 'all', 'open'
  ),

  -- act-8 │ this Wednesday 7:00am │ cycling │ Tom │ mid-week (tests "This week" ≠ "This weekend")
  (
    '00000000-0000-0000-0001-000000000008',
    '00000000-0000-0000-0000-000000000004',
    'cycling',
    'Scottsdale greenbelt ride',
    'Indian Bend Wash Greenbelt',
    33.4942, -111.9261,
    (date_trunc('week', current_date)::timestamp + interval '2 days 7 hours') AT TIME ZONE 'America/Phoenix',
    null, 'all', 'open'
  ),

  -- act-7 │ yesterday │ paddleboard │ Maria │ past — filtered from main feed
  (
    '00000000-0000-0000-0001-000000000007',
    '00000000-0000-0000-0000-000000000003',
    'paddleboard',
    'Tempe Town Lake paddle',
    'Tempe Town Lake',
    33.4255, -111.9400,
    (current_date::timestamp - interval '1 day') AT TIME ZONE 'America/Phoenix',
    6, 'all', 'open'
  )

ON CONFLICT (id) DO NOTHING;

-- ─── Participants ─────────────────────────────────────────────────────────────

INSERT INTO public.participants (activity_id, user_id, status)
VALUES
  -- act-1: Jake, Maria
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000002', 'joined'),
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000003', 'joined'),

  -- act-2: Jake
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000002', 'joined'),

  -- act-3: Tom, real user
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000004', 'joined'),
  ('00000000-0000-0000-0001-000000000003', (SELECT id FROM public.profiles WHERE username = 'wallace'), 'joined'),

  -- act-4: Maria, Tom
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000003', 'joined'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000004', 'joined'),

  -- act-5: real user, Jake, Maria, Tom (fills all 4 spots → status=full)
  ('00000000-0000-0000-0001-000000000005', (SELECT id FROM public.profiles WHERE username = 'wallace'), 'joined'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000002', 'joined'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000003', 'joined'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000004', 'joined'),

  -- act-6: real user
  ('00000000-0000-0000-0001-000000000006', (SELECT id FROM public.profiles WHERE username = 'wallace'), 'joined')

ON CONFLICT (activity_id, user_id) DO NOTHING;

-- ─── Restore FK enforcement ───────────────────────────────────────────────────
SET session_replication_role = DEFAULT;
