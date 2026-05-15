# Rally — Claude Code Instructions

## Project

Next.js 16 app for finding people to do active hobbies with.
Supabase (auth + postgres + realtime). Mapbox GL. Deployed on Vercel.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + Framer Motion
- Supabase (@supabase/ssr)
- Mapbox GL JS
- proxy.ts (NOT middleware.ts — Next.js 16 convention)

## Brand

- Primary accent: #1D9E75 (teal green)
- Logo: green dot + Rally wordmark, font-weight 600
- Cards: white bg, 0.5px border, rounded-xl, no shadows
- Buttons: teal filled (primary), ghost outline (secondary)
- Sport pills: pickleball=#E1F5EE/#0F6E56, running=#EAF3DE/#3B6D11, boxing=#FAEEDA/#854F0B, hiking=#EAF3DE/#3B6D11, gym=#E6F1FB/#185FA5, paddleboard=#E1F5EE/#0F6E56

## File Structure Rules

Before writing any new code, place it in the correct location:

- Reusable UI primitives → src/components/ui/
- Activity components → src/components/activities/
- Map components → src/components/map/
- Nav components → src/components/nav/
- Server actions → src/lib/actions/
- Supabase queries → src/lib/queries/
- Utility functions → src/lib/utils/
- React hooks → src/hooks/
- TypeScript types → src/types/index.ts
- Never create new folders unless explicitly asked
- Never inline utility logic if a util file already exists for it

## Schema

profiles: id, username, full_name, avatar_url, bio, lat, lng, city, sports text[], instagram_handle, created_at
activities: id, creator_id, title, sport, description, lat, lng, location_name, starts_at, max_participants, skill_level, status, community_tag, created_at
participants: id, activity_id, user_id, status, joined_at

## Key Decisions

- No communities table — community emerges through sport tags + location
- Auth: Google OAuth via Supabase
- Location: browser geolocation (not profile city) for feed distance
- proxy.ts not middleware.ts (Next.js 16)
- Supabase publishable key (sb*publishable*...) not legacy anon key
