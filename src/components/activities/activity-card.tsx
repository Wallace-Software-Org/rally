"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type {
  ActivityHostSummary,
  ActivityWithParticipants,
  Participant,
} from "@/types";
import { useRealtimeParticipants } from "@/hooks/use-realtime-participants";
import { useForcedFull } from "@/hooks/use-forced-full";
import {
  getParticipantsWithHostFirst,
  quickJoinLoginHref,
  spotsLeftText,
} from "@/lib/utils/activity-participants";
import { formatActivityDate } from "@/lib/utils/format-time";
import Avatar from "@/components/ui/avatar";
import {
  getInitials,
  shouldBlurAvatarForViewer,
} from "@/lib/utils/avatar";
import ActivityPill from "@/components/ui/activity-pill";

type CardProps = {
  activity: ActivityWithParticipants;
  userId: string | null;
  isJoined: boolean;
  isJoining: boolean;
  // Returns the join outcome so the card can flip to Full on a capacity
  // rejection, mirroring the map popup.
  onJoin: () => Promise<{ ok: boolean; full: boolean }>;
};

function initialParticipants(
  activity: ActivityWithParticipants,
): Participant[] {
  if (!Array.isArray(activity.participants)) return [];

  return getParticipantsWithHostFirst({
    participants: activity.participants,
    creatorId: activity.creator_id,
    hostProfile: activity.host,
  });
}

function hasUserJoined(
  participants: Participant[],
  currentUserId: string | null,
) {
  return (
    currentUserId !== null &&
    participants.some((participant) => participant.user_id === currentUserId)
  );
}

function getAvatarParticipants(
  activity: ActivityWithParticipants,
  participants: Participant[],
) {
  return getParticipantsWithHostFirst({
    participants,
    creatorId: activity.creator_id,
    hostProfile: activity.host,
  })
    .filter((participant) => participant.profiles)
    .slice(0, 5);
}


// ── CardAction ────────────────────────────────────────────────────────────────
// Shared CTA pill used by both card variants. Priority order:
//   logged-out → Sign in  |  host → null  |  joined → Going ✓  |  full → Full  |  → Join

function CardAction({
  activity,
  userId,
  isJoined,
  isJoining,
  onJoin,
  spotsLeft,
  router,
  showJoinAction = true,
}: Omit<CardProps, "onJoin"> & {
  onJoin: () => void;
  spotsLeft: number | null;
  router: ReturnType<typeof useRouter>;
  showJoinAction?: boolean;
}) {
  const pill =
    "w-20 h-9 flex items-center justify-center rounded-full text-xs font-semibold";

  if (!showJoinAction && userId !== activity.creator_id) {
    return null;
  }

  if (userId === null) {
    return (
      <button
        onClick={(e) => {
          // Both preventDefault and stopPropagation needed: card root is a
          // tappable div/Link that would also fire without these.
          e.preventDefault();
          e.stopPropagation();
          router.push(quickJoinLoginHref(activity.id));
        }}
        className={`${pill} border border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal transition-colors`}
      >
        Sign in
      </button>
    );
  }

  if (userId === activity.creator_id) {
    // Host indicator now lives in the top-left tag row (see CardTags), so the
    // CTA area shows nothing for the host.
    return null;
  }

  if (isJoined) {
    return (
      <span
        className={`${pill} cursor-pointer border border-brand-teal text-brand-teal bg-transparent`}
      >
        Going ✓
      </span>
    );
  }

  if (spotsLeft !== null && spotsLeft <= 0) {
    return <span className="text-sm text-brand-muted font-medium">Full</span>;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onJoin();
      }}
      disabled={isJoining}
      className={`${pill} cursor-pointer bg-brand-teal text-white hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-50`}
    >
      {isJoining ? "…" : "Join"}
    </button>
  );
}

// ── CardTags ──────────────────────────────────────────────────────────────────
// Top-left tag row: Sport tag, then Hosting (host only), then Private (private
// activities, shown only to the creator or a participant who can already see it).

function CardTags({
  activity,
  userId,
  isParticipant,
}: {
  activity: ActivityWithParticipants;
  userId: string | null;
  isParticipant: boolean;
}) {
  const isHost = userId !== null && activity.creator_id === userId;
  const showPrivate =
    activity.visibility === "private" && (isHost || isParticipant);

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      <ActivityPill sport={activity.sport} />
      {isHost && (
        <span className="tag-warm w-min rounded-full px-2.5 py-0.5 text-xs font-medium">
          Hosting
        </span>
      )}
      {showPrivate && (
        <span className="tag-private w-min rounded-full px-2.5 py-0.5 text-xs font-medium">
          Private
        </span>
      )}
    </div>
  );
}

// "Hosted by [creator]" meta line for personal-feed cards the profile is
// attending rather than hosting, mirroring the profile Attending card. Links to
// the creator's profile only on the div-rooted card (showDetails); the grid card
// is itself an anchor, so a nested link there would be invalid markup.
function HostedByLine({
  host,
  linkable,
}: {
  host: ActivityHostSummary | null;
  linkable: boolean;
}) {
  if (!host) return null;
  const inner = (
    <>
      <Avatar
        src={host.avatar_url}
        name={host.full_name}
        dimension={20}
        className="w-5 h-5 flex-none"
        initialsClassName="text-[9px]"
      />
      <span className="truncate">Hosted by {host.full_name}</span>
    </>
  );

  return linkable && host.username ? (
    <Link
      href={`/profile/${host.username}`}
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors w-fit"
    >
      {inner}
    </Link>
  ) : (
    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted w-fit">
      {inner}
    </span>
  );
}

// ── ActivityCardDesktop ───────────────────────────────────────────────────────
// Used at all breakpoints in the feed grid.
// showDetails=true  (xl left panel): clicking fires onSelect → opens map popup
// showDetails=false (< xl grid):     clicking navigates to the detail page

type DesktopCardProps = CardProps & {
  isActive: boolean;
  showDetails: boolean;
  onSelect: () => void;
  // Personal feed: show a "Hosted by [creator]" line for activities the page's
  // profile is attending rather than hosting.
  showHostedBy?: boolean;
};

export function ActivityCardDesktop({
  activity,
  userId,
  isActive,
  showDetails,
  isJoining,
  onSelect,
  onJoin,
  showHostedBy = false,
}: DesktopCardProps) {
  const router = useRouter();
  const { participants: liveParticipants, participantCount } =
    useRealtimeParticipants({
      activityId: activity.id,
      initialParticipants: initialParticipants(activity),
      profileColumns: "full_name, avatar_url",
    });
  const isJoinedLive = hasUserJoined(liveParticipants, userId);

  const max = activity.max_participants;
  // Full override after a capacity rejection, so a simultaneous-join loser flips
  // to Full immediately even before the router.refresh re-seed lands. Bridge,
  // not a latch (see useForcedFull): it releases once the live count confirms
  // fullness, so a later leave reopens the card.
  const [forcedFull, setForcedFull] = useForcedFull(participantCount, max);
  const isFull = max !== null && (forcedFull || participantCount >= max);
  const spotsLeft = max === null ? null : isFull ? 0 : max - participantCount;
  const displayCount = isFull && max !== null ? max : participantCount;

  async function handleJoin() {
    const result = await onJoin();
    if (result.full) {
      setForcedFull(true);
      // Re-seed from the server snapshot (which includes the winner's row) so
      // the count self-corrects everywhere, not just this card.
      router.refresh();
    }
  }

  const avatarParticipants = getAvatarParticipants(activity, liveParticipants);
  const { time, date } = formatActivityDate(activity.starts_at);

  const cardClass = `h-full rounded-xl px-4 py-5 flex flex-col gap-1 transition-all border ${
    isActive
      ? "border-brand-teal bg-brand-teal/10"
      : "border-brand-border bg-brand-bg hover:border-brand-border-hover"
  }`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <CardTags
          activity={activity}
          userId={userId}
          isParticipant={isJoinedLive}
        />
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm xl:text-xs font-medium text-brand-text leading-tight">
            {time}
          </span>
          <span className="text-sm xl:text-xs text-brand-muted leading-tight">{date}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-brand-text leading-snug truncate">
          {activity.title}
        </p>

        <p className="text-sm xl:text-xs text-brand-muted flex items-center gap-1 min-w-0">
          <svg
            width="8"
            height="10"
            viewBox="0 0 8 10"
            fill="currentColor"
            className="flex-none"
            aria-hidden="true"
          >
            <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
          <span className="truncate">{activity.location_name}</span>
          {activity.skill_level && (
            <span className="text-brand-muted flex-none">
              · {activity.skill_level}
            </span>
          )}
        </p>

        {showHostedBy && (
          <HostedByLine host={activity.host} linkable={showDetails} />
        )}
      </div>
      {/* mt-auto pushes this row to the bottom when the grid stretches cards to equal height */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {avatarParticipants.length > 0 && (
          <div className="flex -space-x-1.5 flex-none">
            {avatarParticipants.map((participant) => {
              const profile = participant.profiles!;
              const shouldBlurAvatar = shouldBlurAvatarForViewer(
                userId,
                participant.user_id === activity.creator_id,
              );

              return (
                <div
                  key={participant.id}
                  className="relative w-5 h-5 rounded-full bg-brand-avatar-bg ring-[1.5px] ring-brand-bg overflow-hidden flex items-center justify-center"
                >
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt=""
                      fill
                      className={`object-cover${
                        shouldBlurAvatar ? " blur-sm" : ""
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-[8px] font-semibold text-brand-avatar-text${
                        shouldBlurAvatar ? " blur-sm" : ""
                      }`}
                    >
                      {getInitials(profile.full_name)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <span className="text-xs text-brand-muted flex-1">
          {spotsLeftText(activity.max_participants, displayCount)}
        </span>
        <CardAction
          activity={activity}
          userId={userId}
          isJoined={isJoinedLive}
          isJoining={isJoining}
          onJoin={handleJoin}
          spotsLeft={spotsLeft}
          router={router}
          showJoinAction={showDetails}
        />
      </div>
    </>
  );

  if (showDetails) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`cursor-pointer ${cardClass}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/activity/${activity.id}`}
      className={`cursor-pointer ${cardClass}`}
    >
      {inner}
    </Link>
  );
}
