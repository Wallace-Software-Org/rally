"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ActivityWithParticipants, Participant } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { formatActivityDate } from "@/lib/utils/format-time";
import ActivityPill from "@/components/ui/activity-pill";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type CardProps = {
  activity: ActivityWithParticipants;
  userId: string | null;
  isJoined: boolean;
  isJoining: boolean;
  onJoin: () => void;
};

function initialParticipantCount(activity: ActivityWithParticipants): number {
  return initialParticipants(activity).length;
}

function initialParticipants(
  activity: ActivityWithParticipants,
): Participant[] {
  if (!Array.isArray(activity.participants)) return [];

  const seenUserIds = new Set<string>();
  return activity.participants.filter((participant) => {
    if (seenUserIds.has(participant.user_id)) return false;
    seenUserIds.add(participant.user_id);
    return true;
  });
}

type RealtimeState = {
  activityId: string;
  initialCount: number;
  currentUserId: string | null;
  count: number;
  participants: Participant[];
  hasJoined: boolean;
  deleteLogKey: number;
};

function hasUserJoined(
  participants: Participant[],
  currentUserId: string | null,
) {
  return (
    currentUserId !== null &&
    participants.some((participant) => participant.user_id === currentUserId)
  );
}

function useRealtimeParticipants(
  activity: ActivityWithParticipants,
  currentUserId: string | null,
): {
  participantCount: number;
  liveParticipants: Participant[];
  hasJoined: boolean;
} {
  const initialParticipantList = initialParticipants(activity);
  const initialCount = initialParticipantCount(activity);
  const [state, setState] = useState<RealtimeState>(() => ({
    activityId: activity.id,
    initialCount,
    currentUserId,
    count: initialCount,
    participants: initialParticipantList,
    hasJoined: hasUserJoined(initialParticipantList, currentUserId),
    deleteLogKey: 0,
  }));

  const isSync =
    state.activityId === activity.id &&
    state.initialCount === initialCount &&
    state.currentUserId === currentUserId;
  const participantCount = isSync ? state.count : initialCount;
  const liveParticipants = isSync ? state.participants : initialParticipantList;
  const hasJoined = isSync
    ? state.hasJoined
    : hasUserJoined(initialParticipantList, currentUserId);

  useEffect(() => {
    if (state.deleteLogKey === 0) return;
    console.log("participants after DELETE length", state.participants.length);
  }, [state.deleteLogKey, state.participants.length]);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const supabase = createClient();
    const channelId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    const channel = supabase
      .channel(`participants:${activity.id}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `activity_id=eq.${activity.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { id: string; user_id: string };
            void supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", row.user_id)
              .single()
              .then(({ data: profile }) => {
                setState((prev) => {
                  const isCurrent =
                    prev.activityId === activity.id &&
                    prev.initialCount === initialCount &&
                    prev.currentUserId === currentUserId;
                  const nextParticipants = [
                    ...(isCurrent ? prev.participants : initialParticipantList),
                    {
                      id: row.id,
                      user_id: row.user_id,
                      profiles: profile ?? null,
                    },
                  ];

                  return {
                    activityId: activity.id,
                    initialCount,
                    currentUserId,
                    count: nextParticipants.length,
                    participants: nextParticipants,
                    hasJoined: hasUserJoined(nextParticipants, currentUserId),
                    deleteLogKey: prev.deleteLogKey,
                  };
                });
              });
          }

          if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            console.log("participants DELETE payload.old", payload.old);
            setState((prev) => {
              const isCurrent =
                prev.activityId === activity.id &&
                prev.initialCount === initialCount &&
                prev.currentUserId === currentUserId;
              const base = isCurrent
                ? prev.participants
                : initialParticipantList;
              const nextParticipants = base.filter(
                (participant) => participant.id !== row.id,
              );

              return {
                activityId: activity.id,
                initialCount,
                currentUserId,
                count: nextParticipants.length,
                participants: nextParticipants,
                hasJoined: hasUserJoined(nextParticipants, currentUserId),
                deleteLogKey: prev.deleteLogKey + 1,
              };
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // activity.participants intentionally omitted: re-sync only on id/count
    // changes, not on every parent render with a new array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, initialCount, currentUserId]);

  return { participantCount, liveParticipants, hasJoined };
}

function spotsLeftText(
  maxParticipants: number | null,
  participantCount: number,
) {
  if (maxParticipants === null) return "Open";

  const spotsLeft = Math.max(0, maxParticipants - participantCount);
  if (spotsLeft === 0) return "Full";

  return `${spotsLeft} spots left`;
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
}: CardProps & {
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
          router.push("/login");
        }}
        className={`${pill} border border-brand-border text-brand-muted hover:border-brand-teal hover:text-brand-teal transition-colors`}
      >
        Sign in
      </button>
    );
  }

  if (userId === activity.creator_id) {
    return (
      <span className="h-9 xl:w-20 xl:border xl:border-brand-muted/40 rounded-full flex justify-center items-center text-xs font-medium text-brand-muted/80">
        Hosting
      </span>
    );
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

// ── ActivityCardMobile ────────────────────────────────────────────────────────
// Full-width Link card used on xs screens. Tapping navigates directly to the
// detail page — no map popup interaction.

type MobileCardProps = CardProps & {
  isActive: boolean;
  onSelect: () => void;
};

export function ActivityCardMobile({
  activity,
  userId,
  isActive,
  isJoining,
  onJoin,
}: MobileCardProps) {
  const router = useRouter();
  const {
    participantCount,
    liveParticipants,
    hasJoined: isJoinedLive,
  } = useRealtimeParticipants(activity, userId);
  const spotsLeft =
    activity.max_participants === null
      ? null
      : Math.max(0, activity.max_participants - participantCount);
  const avatars = liveParticipants
    .filter((p) => p.profiles)
    .map((p) => p.profiles!)
    .slice(0, 5);
  const { time, date } = formatActivityDate(activity.starts_at);

  return (
    <Link
      href={`/activity/${activity.id}`}
      className={`rounded-xl p-[13px_14px] flex flex-col gap-2 transition-all ${
        isActive
          ? "border-[1.5px] border-brand-teal bg-brand-teal/10"
          : "border border-brand-border bg-brand-bg"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <ActivityPill sport={activity.sport} />
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-medium text-brand-text leading-tight">
            {time}
          </span>
          <span className="text-xs text-brand-muted leading-tight">{date}</span>
        </div>
      </div>
      <p className="text-base font-medium text-brand-text leading-snug">
        {activity.title}
      </p>
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-brand-muted flex items-center gap-1 min-w-0">
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
        </p>
        <p className="text-xs text-brand-muted">
          {"— mi" /* distance placeholder */}
          {activity.skill_level ? ` · ${activity.skill_level}` : ""}
        </p>
      </div>
      {/* mt-auto pushes this row to the bottom when the grid stretches cards to equal height */}
      <div className="flex items-center gap-2 mt-auto pt-0.5">
        {avatars.length > 0 && (
          <div className="flex -space-x-1.5 flex-none">
            {avatars.map((av, i) => (
              <div
                key={i}
                className="relative w-5.5 h-5.5 rounded-full bg-brand-avatar-bg ring-[1.5px] ring-brand-bg overflow-hidden flex items-center justify-center"
              >
                {av.avatar_url ? (
                  <Image
                    src={av.avatar_url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-[8px] font-semibold text-brand-avatar-text">
                    {av.full_name ? initials(av.full_name) : "?"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="text-xs text-brand-muted flex-1">
          {spotsLeftText(activity.max_participants, participantCount)}
        </span>
        <CardAction
          activity={activity}
          userId={userId}
          isJoined={isJoinedLive}
          isJoining={isJoining}
          onJoin={onJoin}
          spotsLeft={spotsLeft}
          router={router}
          showJoinAction={false}
        />
      </div>
    </Link>
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
};

export function ActivityCardDesktop({
  activity,
  userId,
  isActive,
  showDetails,
  isJoining,
  onSelect,
  onJoin,
}: DesktopCardProps) {
  const router = useRouter();
  const {
    participantCount,
    liveParticipants,
    hasJoined: isJoinedLive,
  } = useRealtimeParticipants(activity, userId);
  const spotsLeft =
    activity.max_participants === null
      ? null
      : Math.max(0, activity.max_participants - participantCount);
  const avatars = liveParticipants
    .filter((p) => p.profiles)
    .map((p) => p.profiles!)
    .slice(0, 5);
  const { time, date } = formatActivityDate(activity.starts_at);

  const cardClass = `h-full rounded-xl px-4 py-5 flex flex-col gap-1 transition-all border ${
    isActive
      ? "border-brand-teal bg-brand-teal/10"
      : "border-brand-border bg-brand-bg hover:border-brand-border-hover"
  }`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <ActivityPill sport={activity.sport} />
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-medium text-brand-text leading-tight">
            {time}
          </span>
          <span className="text-xs text-brand-muted leading-tight">{date}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-brand-text leading-snug truncate">
          {activity.title}
        </p>

        <p className="text-xs text-brand-muted flex items-center gap-1 min-w-0">
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
      </div>
      {/* mt-auto pushes this row to the bottom when the grid stretches cards to equal height */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {avatars.length > 0 && (
          <div className="flex -space-x-1.5 flex-none">
            {avatars.map((av, i) => (
              <div
                key={i}
                className="relative w-5 h-5 rounded-full bg-brand-avatar-bg ring-[1.5px] ring-brand-bg overflow-hidden flex items-center justify-center"
              >
                {av.avatar_url ? (
                  <Image
                    src={av.avatar_url}
                    alt=""
                    fill
                    className={`object-cover${userId === null ? " blur-sm" : ""}`}
                  />
                ) : (
                  <span
                    className={`text-[8px] font-semibold text-brand-avatar-text${userId === null ? " blur-sm" : ""}`}
                  >
                    {av.full_name ? initials(av.full_name) : "?"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="text-xs text-brand-muted flex-1">
          {spotsLeftText(activity.max_participants, participantCount)}
        </span>
        <CardAction
          activity={activity}
          userId={userId}
          isJoined={isJoinedLive}
          isJoining={isJoining}
          onJoin={onJoin}
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/activity/${activity.id}`)}
      onKeyDown={(e) =>
        e.key === "Enter" && router.push(`/activity/${activity.id}`)
      }
      className={`cursor-pointer ${cardClass}`}
    >
      {inner}
    </div>
  );
}
