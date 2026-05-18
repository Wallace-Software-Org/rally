"use client";

import type { ActivityWithParticipants } from "@/types";
import { SPORT_COLORS, getSportLabel } from "@/lib/utils/sport-config";
import { formatActivityTime } from "@/lib/utils/format-time";
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
  isJoined: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  onJoin: () => void;
  onLeave: () => void;
};

export function ActivityCardMobile({
  activity,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
}: CardProps) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C8E6DC",
    text: "#1A6B52",
  };
  const participantCount = Array.isArray(activity.participants)
    ? activity.participants.length
    : 0;
  const spotsLeft = activity.max_participants - participantCount;

  return (
    <div className="rounded-xl bg-[#F0EAE2] p-2.5 flex flex-col gap-2 border border-[#C8B8A8]">
      <div className="flex items-start justify-between gap-1">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <span className="text-[10px] text-[#7A6A5A] leading-4 shrink-0">
          {formatActivityTime(activity.starts_at)}
        </span>
      </div>
      <p className="text-sm font-medium text-[#2C2C2C] leading-snug">
        {activity.title}
      </p>
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] text-[#7A6A5A] flex items-center gap-1 min-w-0">
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
        <p className="text-[11px] text-[#7A6A5A]">
          {"— mi" /* distance placeholder — wire useLocation to calculate this */}
          {activity.skill_level ? ` · ${activity.skill_level}` : ""}
        </p>
      </div>
      <div className="flex items-center justify-between gap-1 mt-auto pt-0.5">
        <span className="text-[11px] text-[#7A6A5A]">
          {spotsLeft <= 0
            ? "Full"
            : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"}`}
        </span>
        <JoinButton
          isJoined={isJoined}
          isJoining={isJoining}
          isLeaving={isLeaving}
          spotsLeft={spotsLeft}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      </div>
    </div>
  );
}

type DesktopCardProps = CardProps & {
  isActive: boolean;
  onSelect: () => void;
};

export function ActivityCardDesktop({
  activity,
  isActive,
  isJoined,
  isJoining,
  isLeaving,
  onSelect,
  onJoin,
  onLeave,
}: DesktopCardProps) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C8E6DC",
    text: "#1A6B52",
  };
  const participantCount = Array.isArray(activity.participants)
    ? activity.participants.length
    : 0;
  const spotsLeft = activity.max_participants - participantCount;

  const avatars = activity.participants
    .filter((p) => p.profiles)
    .slice(0, 3)
    .map((p) => p.profiles!);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`rounded-xl p-2.75 flex flex-col gap-2 cursor-pointer transition-all ${
        isActive
          ? "ring-[1.5px] ring-[#1D9E75] bg-[#C8E6DC]/30"
          : "border border-[#C8B8A8] bg-[#F0EAE2] hover:border-[#B8A898]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <span className="text-[10px] text-[#7A6A5A] leading-4 shrink-0">
          {formatActivityTime(activity.starts_at)}
        </span>
      </div>

      <p className="text-[13px] font-medium text-[#2C2C2C] leading-snug">
        {activity.title}
      </p>

      <p className="text-[11px] text-[#7A6A5A] flex items-center gap-1 min-w-0">
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
          <span className="text-[#7A6A5A] flex-none">
            · {activity.skill_level}
          </span>
        )}
      </p>

      <div className="flex items-center gap-2 mt-auto pt-0.5">
        {avatars.length > 0 && (
          <div className="flex -space-x-1.5 flex-none">
            {avatars.map((av, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-[#D4C4B4] ring-[1.5px] ring-[#F0EAE2] overflow-hidden flex items-center justify-center"
              >
                {av.avatar_url ? (
                  <img
                    src={av.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[8px] font-semibold text-[#5C4A38]">
                    {av.full_name ? initials(av.full_name) : "?"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="text-[11px] text-[#7A6A5A] flex-1">
          {spotsLeft <= 0
            ? "Full"
            : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"}`}
        </span>
        <JoinButton
          isJoined={isJoined}
          isJoining={isJoining}
          isLeaving={isLeaving}
          spotsLeft={spotsLeft}
          onJoin={onJoin}
          onLeave={onLeave}
          stopPropagation
        />
      </div>
    </div>
  );
}
