# Rally — Claude Code Instructions

## Project

Next.js 16 app for finding people to do active activities with.
Peer-to-peer: someone planning an activity who wants company, not an events platform.
Supabase (auth + postgres + realtime). Mapbox GL. Deployed on Vercel at rallytime.xyz.

## Stack

- Next.js 16.2.6 (App Router, TypeScript 5.9.3), React 19.2.4
- Tailwind v4 + Framer Motion
- Supabase (@supabase/ssr): auth + postgres + realtime
- Mapbox GL JS (via react-map-gl declarative Map/Marker)
- Vercel deploy, Node 20.19.2, macOS arm64 local
- proxy.ts (NOT middleware.ts — Next.js 16 convention)

## Environments

- Production: main branch → rallytime.xyz, prod Supabase project (ref ratzdsjmncygczrnclna)
- Staging: dev branch → stable Vercel preview, separate staging Supabase project (ref ukczrmsncvbakaolcbjk)
- Feature branches off dev, each gets an auto preview URL
- Vercel env scoping: Production vars = prod Supabase, Preview vars = staging Supabase
- NEXT_PUBLIC_SITE_URL set to https://rallytime.xyz on Production only; Preview falls back to VERCEL_URL via getSiteUrl()
- Never commit directly to main. Branch off dev.

## Branch + commit naming

- feature/kebab-name, fix/kebab-name, chore/kebab-name, off dev
- Commits: feat:, fix:, chore: prefixes matching the branch type
- Delete branches after merge to dev

## CI/CD

- GitHub Actions runs on push and PR to dev and main: typecheck, lint, vitest (no next build; Vercel builds previews)
- CI pins npm to v11 (matches local) and uses `npm install --no-save --no-audit --no-fund` instead of `npm ci`, because the lockfile is generated on macOS arm64 but CI runs linux x64, and platform-specific optional deps (@emnapi) break strict npm ci

## Brand

- Light and dark mode native. No white backgrounds anywhere. No gradients, no shadows. Minimal and spacious.
- Primary accent teal: #4A9B8E (canonical, also share card background). NOTE: an older #1D9E75 exists in stale notes; #4A9B8E is correct.
- Logo: green dot + Rally wordmark, font-weight 600
- Cards: beige surface bg, 0.5px borders, rounded
- Sport tags: fixed predefined list with distinct color pills, plus neutral gray "Other". No custom/dynamic tags.
- Buttons: see tier system below

## Design tokens (globals.css @theme)

- bg #E8DFD1
- card #D4C5B3
- surface #DFD3C0
- input #ECE5DA (form field fill, also dropdown panel bg)
- teal #4A9B8E (primary accent + share card bg)
- text #5A4A3A
- muted #7A6854
- border rgba(90,74,58,0.25)
- warm #6B5430
- warm-muted #E8DCC8 (text on teal, share card text)
- private #d7b6bb, private-text #4d252b, private-border #9b4a57

## Utility classes (Tailwind v4 @utility, NOT @layer utilities — that silently drops in v4)

Buttons:

- btn-tier-1: primary, solid teal
- btn-tier-2: secondary, warm fill
- btn-tier-3: tertiary, ghost
- btn-tier-danger: destructive, muted red
- btn-tier-private: private actions, warm-muted bg / warm text / warm border

Tags: tag-teal, tag-warm, tag-private

Form: field-label (text-sm font-medium text-brand-text), field-error (text-sm text-brand-danger)

Other: scrollbar-brand (6px thin, brand-muted thumb, warm hover, transparent track — used on dropdown scroll containers)

Disabled buttons: hover rules scoped &:hover:not(:disabled), and disabled sets cursor-not-allowed. Do not replay hover animation on disabled buttons.

## Breakpoints

- xl: is the ONLY layout breakpoint. Never md: or lg: for layout switching.
- lg: allowed only for card grid column density.
- Desktop layout must never change when making mobile-only adjustments.

## Next.js 16 + React 19 conventions

- Server components by default. "use client" only when strictly necessary (event handlers, hooks, browser APIs). Isolate "use client" to the small interactive inner component, not whole pages.
- Server actions for all mutations, in src/lib/actions/
- Data fetching in server components via async/await, never useEffect
- Supabase server client (src/lib/supabase/server.ts) in server components/actions; browser client only in client components
- Use next/navigation, never next/router
- Post-create/redirect nav: use redirect(url, RedirectType.replace) to keep the submitted form out of history
- URL building: use getSiteUrl() from src/lib/utils/ for absolute URLs (share card, OG). OAuth redirectTo intentionally uses window.location.origin directly, leave it.
- Mapbox markers: gate <Marker> on mapLoaded driven by both onLoad and onStyleData using mapRef.current.isStyleLoaded(), not onLoad alone, or HMR crashes with an appendChild error.

## File structure (check before creating; never make new folders unless asked)

- Reusable UI primitives → src/components/ui/
- Activity components → src/components/activities/
- Map components → src/components/map/
- Nav components → src/components/nav/
- Server actions → src/lib/actions/
- Supabase queries → src/lib/queries/
- Utility functions → src/lib/utils/
- React hooks → src/hooks/
- TypeScript types → src/types/index.ts
- Never inline utility logic if a util file already exists

## Schema (3 tables)

profiles: id (FK auth.users), username (unique), full_name, avatar_url, bio, lat, lng, city, sports text[], instagram_handle, created_at
activities: id, creator_id (FK profiles), title, sport, description, lat, lng, location_name, starts_at, ends_at (nullable, defaults starts_at + 1hr server-side), max_participants, skill_level, status, community_tag, external_link, visibility ('public'/'private', default public, check constraint), created_at
participants: id, activity_id (FK activities), user_id (FK profiles), status, joined_at

FKs: profiles.id → auth.users; activities.creator_id → profiles; participants.activity_id → activities; participants.user_id → profiles.
RLS policies exist on all tables. Storage: avatars bucket (public), own-folder policies (INSERT/UPDATE/SELECT on {uid}/ path).

## Key decisions

- creator_id not host_id
- No communities table; community emerges via tags + location
- Auth: Google OAuth via Supabase; publishable key (sb*publishable*...) not legacy anon
- Feed distance uses browser geolocation, not profile city
- profiles.sports text[] is source of truth for activity preferences
- Filter bar pins first 5 selected activities; rest in a More dropdown (Your activities / Other activities)
- Activities list hardcoded in src/lib/utils/sport-config.ts; Supabase lookup migration planned when stable
- Repeat activity is a one-click clone with 7-day offset, not RRULE
- external_link: when set, Join becomes Register (opens external), Rally members shown separately

## Working style

- Concise responses. Explain rationale for UX decisions so Wallace makes the final call. Iterate on visual mockups before committing to a Claude Code prompt.
- Codex for isolated single-file tasks; Claude Code for multi-file
- Copy rules: no em dashes, no double dashes, no AI-sounding language, "activities" not "sports"
- If a Tailwind class is applied correctly but not rendering, check @layer utilities vs @utility (v4)

## Shipped (not a roadmap, current reality)

Two-week MVP complete: profile page, feed + map, activity detail (public/private, logged-in/out), quick-join OAuth flow, share card via @vercel/og, ShareStoryModal, edit activity, realtime spots + avatars, form validation, custom→fixed sport tags, private activity gating.
Post-MVP shipped: mobile polish sprint, CI/CD + staging, site-url centralization, field utilities, scrollbar + dropdown styling, disabled button hover fix, activity-create back-button fix, mini-map HMR fix.

## Backlog

Instagram group-chat modal (in progress), Instagram handle nudge on join, host IG copy, 50-mile radius feed filter, share card date format, code audit follow-ups (field-base extraction, inline hex to tokens, brand.ts constants, Toggle/Stepper components), email notifications via Resend, personal feed at rallytime.xyz/feed/[username], calendar view toggle, wipe prod test data before launch.
