"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ActivityWithParticipants } from "@/types";
import { SPORT_COLORS, getSportLabel } from "@/lib/utils/sport-config";
import { formatActivityDate } from "@/lib/utils/format-time";
import JoinButton from "./join-button";

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
  isLeaving: boolean;
  onJoin: () => void;
  onLeave: () => void;
};

// ── Mobile card — always a Link; no Details pill ──────────────────────────────

type MobileCardProps = CardProps & {
  isActive: boolean;
  onSelect: () => void;
};

export function ActivityCardMobile({
  activity,
  userId,
  isActive,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
}: MobileCardProps) {
  const router = useRouter();
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C8E6DC",
    text: "#1A6B52",
  };
  const participantCount = Array.isArray(activity.participants)
    ? activity.participants.length
    : 0;
  const spotsLeft =
    activity.max_participants === null
      ? Infinity
      : activity.max_participants - participantCount;
  const avatars = activity.participants
    .filter((p) => p.profiles)
    .slice(0, 3)
    .map((p) => p.profiles!);
  const { time, date } = formatActivityDate(activity.starts_at);

  return (
    <Link
      href={`/activity/${activity.id}`}
      className={`rounded-xl p-[13px_14px] flex flex-col gap-2 transition-all ${
        isActive
          ? "border border-brand-teal bg-brand-teal/3"
          : "border border-brand-border bg-brand-bg"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
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
          {userId ? (
            <span className="truncate">{activity.location_name}</span>
          ) : (
            <span className="rounded px-1.5 bg-brand-border text-brand-border select-none blur-[2px]">
              ••••••••••••
            </span>
          )}
        </p>
        <p className="text-xs text-brand-muted">
          {"— mi" /* distance placeholder */}
          {activity.skill_level ? ` · ${activity.skill_level}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-0.5" onClick={(e) => e.stopPropagation()}>
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
          {activity.max_participants === null
            ? "Open"
            : spotsLeft <= 0
              ? "Full"
              : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"}`}
        </span>
        {userId === null ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push("/login");
            }}
            className="flex items-center justify-center rounded-full border border-brand-border text-brand-muted text-xs font-medium py-1.5 px-4 hover:border-brand-teal hover:text-brand-teal transition-colors"
          >
            Sign in
          </button>
        ) : (
          <JoinButton
            isJoined={isJoined}
            isJoining={isJoining}
            isLeaving={isLeaving}
            spotsLeft={spotsLeft}
            onJoin={onJoin}
            onLeave={onLeave}
            stopPropagation
            className="py-2 w-20 text-xs"
          />
        )}
      </div>
    </Link>
  );
}

// ── Desktop card ──────────────────────────────────────────────────────────────
// showDetails=true (xl): div wrapper + onSelect + Details pill
// showDetails=false (< xl): Link wrapper, no Details pill

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
  isJoined,
  isJoining,
  isLeaving,
  onSelect,
  onJoin,
  onLeave,
}: DesktopCardProps) {
  const router = useRouter();
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C8E6DC",
    text: "#1A6B52",
  };
  const participantCount = Array.isArray(activity.participants)
    ? activity.participants.length
    : 0;
  const spotsLeft =
    activity.max_participants === null
      ? Infinity
      : activity.max_participants - participantCount;
  const avatars = activity.participants
    .filter((p) => p.profiles)
    .slice(0, 3)
    .map((p) => p.profiles!);
  const { time, date } = formatActivityDate(activity.starts_at);

  const cardClass = `rounded-xl p-3.5 flex flex-col gap-0 transition-all border  ${
    showDetails && isActive
      ? "border-brand-teal bg-brand-teal/10"
      : "border-brand-border bg-brand-bg hover:border-brand-border-hover"
  }`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-medium text-brand-text leading-tight">
            {time}
          </span>
          <span className="text-xs text-brand-muted leading-tight">{date}</span>
        </div>
      </div>

      <p className="text-lg font-semibold text-brand-text leading-snug">
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
        {userId ? (
          <span className="truncate">{activity.location_name}</span>
        ) : (
          <span className="rounded px-1.5 bg-brand-border text-brand-border select-none blur-[2px]">
            ••••••••••••
          </span>
        )}
        {activity.skill_level && (
          <span className="text-brand-muted flex-none">
            · {activity.skill_level}
          </span>
        )}
      </p>

      <div className="flex items-center gap-2 mt-auto pt-1.5" onClick={(e) => e.stopPropagation()}>
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
          {activity.max_participants === null
            ? "Open"
            : spotsLeft <= 0
              ? "Full"
              : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"}`}
        </span>
        {showDetails && (
          <Link
            href={`/activity/${activity.id}`}
            onClick={(e) => e.stopPropagation()}
            className="border border-brand-border rounded-full px-3 py-1.5 text-xs text-brand-muted hover:border-brand-teal hover:text-brand-teal transition-colors flex-none"
          >
            Details
          </Link>
        )}
        {userId === null ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push("/login");
            }}
            className="flex items-center justify-center rounded-full border border-brand-border text-brand-muted text-xs font-medium py-1.5 px-4 hover:border-brand-teal hover:text-brand-teal transition-colors"
          >
            Sign in
          </button>
        ) : (
          <JoinButton
            isJoined={isJoined}
            isJoining={isJoining}
            isLeaving={isLeaving}
            spotsLeft={spotsLeft}
            onJoin={onJoin}
            onLeave={onLeave}
            stopPropagation
            className="py-2 w-20 text-xs"
          />
        )}
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
      onKeyDown={(e) => e.key === "Enter" && router.push(`/activity/${activity.id}`)}
      className={`cursor-pointer ${cardClass}`}
    >
      {inner}
    </div>
  );
}
