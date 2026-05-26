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

- Clay bg: #F0EAE2
- Border: #C8B8A8
- Teal accent: #1D9E75
- Text: #2C2C2C
- Muted: #7A6A5A
- Logo: green dot + Rally wordmark, font-weight 600
- Cards: white bg, 0.5px border, rounded-xl, no shadows
- Buttons: teal filled (primary), ghost outline (secondary)
- Activity tag pills: unified single palette defined in sport-config.ts

## Copy Rules

- Never use em dashes or double dashes in any UI copy. Use a period or comma instead.
- Use "activities" not "sports" in all UI copy and labels.
- No AI-sounding language in titles or copy.

## File Structure Rules

Before writing any new code, check the existing structure and place code in the correct location:

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

- creator_id not host_id on activities table
- No communities table. Community emerges through activity tags and location.
- Auth: Google OAuth via Supabase
- Location: browser geolocation (not profile city) for feed distance
- proxy.ts not middleware.ts (Next.js 16)
- Supabase publishable key (sb*publishable*...) not legacy anon key
- profiles.sports text[] is the source of truth for user activity preferences
- Filter bar pins the user's first 5 selected activities. Remaining user activities and all others go into a More dropdown with two sections: "Your activities" and "Other activities"
- Activities list is hardcoded in src/lib/utils/sport-config.ts. Migration to a Supabase lookup table planned when the list stabilizes.
- Activity chat planned after realtime spots. Each activity gets its own Supab
