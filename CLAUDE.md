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
- proxy.ts (NOT middleware.ts, Next.js 16 convention)

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
- Run checks as separate commands, not chained cd one-liners (chains bypass permission allow rules)

## CI/CD

- GitHub Actions runs on push and PR to dev and main: typecheck, lint, vitest (no next build; Vercel builds previews)
- CI pins npm to v11 (matches local) and uses `npm install --no-save --no-audit --no-fund` instead of `npm ci`, because the lockfile is generated on macOS arm64 but CI runs linux x64, and platform-specific optional deps (@emnapi) break strict npm ci

## Brand

- Light and dark mode native. No white backgrounds anywhere. No gradients, no shadows. Minimal and spacious.
- Primary accent teal: #4A9B8E (canonical, also share card background). NOTE: an older #1D9E75 exists in stale notes; #4A9B8E is correct.
- Logo: green dot + Rally wordmark, font-weight 600
- Cards: beige surface bg, 0.5px borders, rounded
- Sport tags: fixed predefined list with distinct color pills, plus neutral gray "Other". No custom/dynamic tags. Tag palette lives intentionally in sport-config.ts (per-sport data, not brand tokens) pending Supabase migration.
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

## Constants (src/lib/brand.ts)

- BRAND_TEAL, MAP_LOADING_BG, SHARE_CARD (dims + palette, consumed by the satori OG route which cannot use CSS vars), MAP_SPRING, MAP_FLY_MS, COPY_FEEDBACK_MS (2000, all copy-reset timeouts)
- ACTIVITY_FULL_ERROR lives in src/lib/utils/activity-participants.ts ("use server" files can only export async functions)
- Never inline these values; import them.

## Utility classes (Tailwind v4 @utility, NOT @layer utilities — that silently drops in v4)

Buttons:

- btn-tier-1: primary, solid teal
- btn-tier-2: secondary, warm fill (also the canonical Edit color)
- btn-tier-3: tertiary, ghost
- btn-tier-danger: destructive, muted red
- btn-tier-private: private actions, warm-muted bg / warm text / warm border

Tags: tag-teal, tag-warm, tag-private

Form: field-base (shared input shell: full width, rounded-xl, brand border, input bg, focus ring ring-[1.5px] ring-brand-teal), field-label, field-error

Other: scrollbar-brand (6px thin, brand-muted thumb, warm hover, transparent track, used on dropdown and tab scroll containers)

Disabled buttons: hover rules scoped &:hover:not(:disabled), and disabled sets cursor-not-allowed. Do not replay hover animation on disabled buttons.

## Shared UI primitives (src/components/ui/)

- Toggle (role="switch"), Stepper (min/max clamped), Avatar (size prop, 1.5px brand border)
- Icons in ui/icons/index.tsx; shared Chevron with open rotation
- Profile card parts (src/components/profile/activity-card-parts.tsx): CardShell, CollapsibleSection, AvatarStrip, CancelledCard, meta helpers. Hosting and Attending managers compose these; never fork card markup.
- Use the shared spotsLeftText()/capacityLine() from activity-participants utils for spots labels ("Open" / "Full" / "1 spot left" / "N spots left"). Never build the string inline.

## Filter dropdowns (convention)

- All feed filter pills use the shared primitives: useDropdown, FilterPill, FilterPanel, FilterOption (src/components/activities/activity-filters.tsx). Never build a bespoke dropdown.
- Pills in order: Activities (multiselect, grouped Your activities / Other activities for logged-in users with sports; flat ungrouped list when logged out or sports empty), Time, Distance, Show (All / Hosting / Attending, single-select, logged-in only, rightmost).
- FilterPanel uses fixed positioning, edge-aware (flips anchor near the right viewport edge), closes on outside scroll.
- Hosting = creator_id === userId. Attending = joined and not creator. Mutually exclusive by definition.
- Filters combine as AND.
- Distance pill: reads "Distance" when no coords exist, radius value when they do. Geolocation is requested ONLY by the Enable location button inside the panel, never on page load. Works for signed-out users (client state); profile coord writes stay auth-gated.

## Participants + capacity (conventions)

- joinActivity calls the join_activity() Postgres function (SECURITY DEFINER, row lock) which atomically checks status + capacity, then inserts. Never insert into participants directly for joins.
- Full rejections return ACTIVITY_FULL_ERROR. Every join surface (feed card, map popup, detail page) consumes the { ok, full } result: flip to Full via useForcedFull and call router.refresh() so all clients re-seed and converge.
- useForcedFull (src/hooks/use-forced-full.ts): bridge, not latch. Render-time clear once the live count reaches max; a later leave then reopens naturally. Use it for any new join surface.
- useRealtimeParticipants: syncs on seed user_id membership, dedupes by user_id, realtime INSERT replaces the optimistic entry. Dedupe with the shared dedupeByUserId anywhere a participant list renders.

## Breakpoints

- xl: is the ONLY structural layout breakpoint. Never md: or lg: for layout switching.
- lg: allowed only for card grid column density.
- md: allowed only for content density within a component (button labels vs icon-only, clamped description visibility), never structure.
- Desktop layout must never change when making mobile-only adjustments.

## Next.js 16 + React 19 conventions

- Server components by default. "use client" only when strictly necessary (event handlers, hooks, browser APIs). Isolate "use client" to the small interactive inner component, not whole pages.
- Server actions for all mutations, in src/lib/actions/
- Every action starts with requireUser() (src/lib/actions/require-user.ts) returning { supabase, user, error }. Never hand-roll the auth check.
- Server-side validation mirrors form rules (activity-validation.ts: lengths, max_participants 2-20, future starts_at on create, lat/lng ranges, sport against list; profile: sports against list, length caps; avatar: MIME allowlist + 2MB; location: clamped coords). Never trust client validation alone.
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
- Profile components → src/components/profile/
- Server actions → src/lib/actions/
- Supabase queries → src/lib/queries/
- Utility functions → src/lib/utils/
- React hooks → src/hooks/
- TypeScript types → src/types/index.ts
- Never inline utility logic if a util file already exists

## Schema (3 tables)

profiles: id (FK auth.users), username (unique, NOT NULL), full_name, avatar_url, bio, lat, lng, city, sports text[], instagram_handle, created_at
activities: id, creator_id (FK profiles, NOT NULL), title, sport, description, lat, lng, location_name (NOT NULL), starts_at, ends_at (nullable, defaults starts_at + 1hr server-side), max_participants, skill_level, status ('open'/'cancelled', NOT NULL default 'open', check constraint), community_tag, external_link, visibility ('public'/'private', NOT NULL default public, check constraint), created_at
participants: id, activity_id (FK activities, NOT NULL), user_id (FK profiles, NOT NULL), status, joined_at, unique (activity_id, user_id)

FKs: profiles.id → auth.users; activities.creator_id → profiles; participants.activity_id → activities; participants.user_id → profiles.
RLS policies exist on all tables. Storage: avatars bucket (public), own-folder policies (INSERT/UPDATE/SELECT on {uid}/ path).
participants has REPLICA IDENTITY FULL (required so realtime DELETE events carry activity_id). Applied on prod and staging.
join_activity(uuid) function: SECURITY DEFINER, locks the activity row, checks status + capacity, inserts with ON CONFLICT DO NOTHING. Applied on prod and staging.

### Generated types

- src/types/supabase.ts is generated from the prod schema. Never hand-edit it. Regenerate after any schema change:
  `npx supabase gen types typescript --project-id ratzdsjmncygczrnclna > src/types/supabase.ts`
- Both Supabase clients (src/lib/supabase/{server,client}.ts) are typed with the generated `Database`, so query results flow typed end to end.
- src/types/index.ts stays the app-level domain type home; generated DB types are a separate concern. Domain types may derive from generated ones, but do not merge them.
- visibility and status are text + check constraints, not Postgres enums (enums are painful to alter). Generated types therefore surface them as plain string; toVisibility() (src/lib/utils/visibility.ts) bridges the DB string to the domain Visibility union at the query boundary. status maps straight through (domain type is string).
- full_name is genuinely nullable (updateProfile writes null for an empty name); the profile-name domain types keep it string | null and render sites handle null (getInitials returns "?"). Do not narrow it away.

## Key decisions

- creator_id not host_id. Hosts auto-join their own activities as participants.
- No communities table; community emerges via tags + location
- Auth: Google OAuth via Supabase; publishable key (sb*publishable*...) not legacy anon
- Sign-out redirects to the feed (/), not the sign-in page
- Feed distance: browser geolocation on user interaction only; on grant coords are written to profiles.lat/lng (logged-in); falls back to stored profile coords; Distance pill stays visible and interactive in every state. Default 100 mi. Radius filtering is client-side for now (server-side is backlogged for scale).
- Private activities are unlisted, not truly private: any authenticated user with the invite link can view and join; excluded from the public feed. Logged-out visitors see a login prompt.
- profiles.sports text[] is source of truth for activity preferences
- Activities list hardcoded in src/lib/utils/sport-config.ts; Supabase lookup migration planned when stable
- Repeat opens the create form PREFILLED from the source activity (title exact, all fields), dated to the next future occurrence of the source weekday/time via nextWeeklyOccurrence(). It never inserts directly. DST-naive (fine for Phoenix, revisit for multi-market).
- Cancel is a status change to 'cancelled', never a delete. Lives in the edit page danger zone, not on cards. Cancelled activities are excluded from the feed and from joining; cards show struck title + Cancelled tag + "N people had joined".
- Profile: Hosting tab is first and DEFAULT for all viewers (owner and visitor). Hosting tab = management hub (Upcoming/Past sections, past collapsed, richer cards with Edit / Copy link / Group chat / Share to Story). Attending mirrors it read-only (host line, quiet Leave with confirm). Non-owners see a read-only list with cancelled hidden. Tab counts = upcoming non-cancelled only.
- Profile header: identity stack is avatar, name, username, bio, then stacked full-width action buttons: Instagram (teal border, all viewers with handle set) above Edit profile (btn-tier-2, owner only).
- Timezones: starts_at is a UTC instant; in-app rendering is viewer-local; the OG share card is intentionally pinned to America/Phoenix (activity-local). Multi-market support is backlogged.
- external_link: when set, Join becomes Register (opens external), Rally members shown separately

## Working style

- Concise responses. Explain rationale for UX decisions so Wallace makes the final call. Iterate on visual mockups before committing to a Claude Code prompt.
- Codex for isolated single-file tasks; Claude Code for multi-file
- Copy rules: no em dashes, no double dashes, no AI-sounding language, "activities" not "sports"
- If a Tailwind class is applied correctly but not rendering, check @layer utilities vs @utility (v4)

## Shipped (not a roadmap, current reality)

Two-week MVP complete: profile page, feed + map, activity detail (public/private, logged-in/out), quick-join OAuth flow, share card via @vercel/og, ShareStoryModal, edit activity, realtime spots + avatars, form validation, custom→fixed sport tags, private activity gating.
Post-MVP shipped: mobile polish sprint, CI/CD + staging, site-url centralization, field utilities, scrollbar + dropdown styling, disabled button hover fix, activity-create back-button fix, mini-map HMR fix, Instagram group-chat modal (host-only), Instagram handle nudge on join, host IG copy, realtime avatar sync on detail page, private activities as unlisted, distance filter with geolocation + profile fallback (auth-decoupled, in-panel trigger), share card date format, filter bar dropdown redesign (shared FilterPill primitives, edge-aware panels, mobile touch sizing), hosting filter (Show pill), spots pluralization helper, sign-out to feed, profile Hosting management hub, Attending hub (read-only mirror), repeat as prefilled create form with next-occurrence date, cancel as status change in edit danger zone, copy-link feedback state, labeled card actions from md:, profile header action row rework, avatar borders, Expand map button (brand styling, bottom center mobile), Hosting default tab for all viewers, code audit cleanup (dead code, tokens, Toggle/Stepper/Avatar/CardShell, field-base, brand.ts), P0 security pass (requireUser, join_activity capacity RPC, server-side validation everywhere), realtime participant dedup + membership-keyed sync, full-rejection convergence across all join surfaces (useForcedFull + refresh re-seed).

## Backlog

- Unify mobile/desktop layout trees (both mount today; doubles renders and realtime channels; single-subscription-per-activity realtime lift rides with it) — biggest perf item
- Pagination on feed and hosting/attending queries + shared select fragment (before growth)
- loading.tsx / error.tsx for feed, profile, detail segments
- Modal focus traps + dropdown keyboard nav (Escape, arrows, listbox roles)
- Muted-text contrast audit (brand-muted on bg is ~3.5:1, below AA for small text)
- Multi-market timezone support: tz column per activity, single format helper, tz-aware repeat math, date-filter bucketing decision
- Move radius filtering server-side for scale
- Visitor Attending-tab privacy decision (hide, or mutual-only) before launch
- Email notifications via Resend (cancel notifications first), personal feed at rallytime.xyz/feed/[username], calendar view toggle, map view snap heights (data-dependent), wipe prod test data before launch
