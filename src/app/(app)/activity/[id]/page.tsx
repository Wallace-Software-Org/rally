import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import { getProfileById } from "@/lib/queries/profiles";
import { hasAcceptedWaiver } from "@/lib/queries/waivers";
import { activityLoginHref } from "@/lib/utils/activity-participants";
import { getSportLabel } from "@/lib/utils/sport-config";
import { SHARE_CARD } from "@/lib/brand";
import ActivityDetailView from "@/components/activities/activity-detail";
import type { ActivityDetail } from "@/types";

const DESCRIPTION_MAX_LEN = 160;
// The share card is cut for an Instagram story (1080x1920, portrait), not a
// landscape OG card, but it's the only per-activity image Rally generates —
// explicit width/height so platforms that honor them don't guess a crop.
const APP_TIME_ZONE = "America/Phoenix";

function truncateDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX_LEN) return text;
  const clipped = text.slice(0, DESCRIPTION_MAX_LEN);
  const lastSpace = clipped.lastIndexOf(" ");
  const cut = lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped;
  return `${cut.trimEnd()}...`;
}

// No description on the activity: fall back to sport, location, and date
// rather than an empty preview. Phoenix-pinned like the share card itself —
// this renders server-side for crawlers with no viewer timezone to localize
// to, and unlike the in-app "Today" labels, a crawler's cached preview can
// outlive the day it was fetched.
function fallbackDescription(activity: ActivityDetail): string {
  const sportLabel = getSportLabel(activity.sport);
  if (!activity.starts_at) {
    return `${sportLabel} in ${activity.location_name}`;
  }
  const date = new Date(activity.starts_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
  return `${sportLabel} in ${activity.location_name}, ${date}`;
}

function buildDescription(activity: ActivityDetail): string {
  const description = activity.description?.trim();
  return description
    ? truncateDescription(description)
    : fallbackDescription(activity);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activity = await getActivityById(id, user?.id ?? null);

  if (activity === null) return {};

  // Private activities must never leak title, description, or image into
  // page metadata: it lands in the HTML <head> regardless of who the current
  // requester is. An anonymous crawler unfurling the link always hits the
  // "private" sentinel below; an authenticated viewer who's allowed to see
  // the activity still gets a full ActivityDetail with visibility "private",
  // so that's checked too, rather than varying the rule by requester.
  if (activity === "private" || activity.visibility === "private") {
    return {};
  }

  const description = buildDescription(activity);

  return {
    title: activity.title,
    description,
    openGraph: {
      title: activity.title,
      description,
      images: [
        {
          url: `/api/activity/${activity.id}/card`,
          width: SHARE_CARD.width,
          height: SHARE_CARD.height,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const postedParam = Array.isArray(query.posted)
    ? query.posted[0]
    : query.posted;
  const joinParam = Array.isArray(query.join) ? query.join[0] : query.join;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;
  const activity = await getActivityById(id, userId);

  if (activity === null) notFound();

  if (activity === "private") {
    // Private is unlisted, not invite-only: any authenticated user with the link
    // can view. getActivityById only returns this sentinel for logged-out
    // visitors, so the gate is purely a prompt to log in and then view. Both
    // links carry the activity as the login return path (the same helper the
    // quick-join flow uses) so OAuth lands back here, not on the feed.
    const loginHref = activityLoginHref(id);
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
        <p className="text-base font-medium text-brand-text">
          This activity is private.
        </p>
        <p className="text-sm text-brand-muted">Log in to view it.</p>
        <Link
          href={loginHref}
          className="mt-1 inline-flex items-center justify-center rounded-xl bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors duration-200"
        >
          Log in
        </Link>
        <Link
          href={loginHref}
          className="text-sm text-brand-muted hover:text-brand-text transition-colors duration-200"
        >
          New here? Sign up
        </Link>
      </div>
    );
  }

  // Quick-join: the user just finished OAuth from a shared activity link. They
  // land here with ?join=true and the join modal opens (the first-time waiver
  // or the short confirmation). Nothing is joined until they confirm it. Never
  // for someone already going (or hosting): a stale ?join=true in history must
  // not reopen a join they have already done.
  const alreadyGoing =
    userId !== null &&
    (userId === activity.creator_id ||
      activity.participants.some((p) => p.user_id === userId));
  const autoOpenJoin = joinParam === "true" && userId !== null && !alreadyGoing;

  // Fetch the viewer's profile once when authenticated and reuse it for both
  // the onboarding banner check and the optimistic Who's going avatar.
  const [viewerProfile, participantWaiverAccepted] = userId
    ? await Promise.all([
        getProfileById(userId),
        hasAcceptedWaiver(supabase, userId, "participant"),
      ])
    : [null, false];

  // Only show the onboarding banner to users whose profile still needs setup.
  // Existing users with a complete profile (activities + avatar) skip it.
  const profileIsComplete =
    !!viewerProfile &&
    Array.isArray(viewerProfile.sports) &&
    viewerProfile.sports.length > 0 &&
    viewerProfile.avatar_url !== null;

  return (
    <ActivityDetailView
      activity={activity}
      userId={userId}
      participantWaiverAccepted={participantWaiverAccepted}
      showPostedBanner={postedParam === "true"}
      autoOpenJoin={autoOpenJoin}
      needsProfileSetup={!profileIsComplete}
      viewerProfile={
        viewerProfile
          ? {
              id: viewerProfile.id,
              full_name: viewerProfile.full_name,
              username: viewerProfile.username,
              avatar_url: viewerProfile.avatar_url,
              instagram_handle: viewerProfile.instagram_handle,
            }
          : null
      }
    />
  );
}
