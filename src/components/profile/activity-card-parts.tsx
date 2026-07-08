import Image from "next/image";
import type { HostParticipant } from "@/types";
import { getInitials } from "@/lib/utils/avatar";

// Shared presentation used by the Hosting and Attending management cards.

export function formatCardMeta(startsAt: string): {
  date: string;
  time: string;
} {
  const d = new Date(startsAt);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

// "date · time · location · skill level", skipping any missing parts.
export function metaLine(
  activity: {
    starts_at: string;
    location_name: string;
    skill_level: string | null;
  },
  withTime: boolean,
): string {
  const { date, time } = formatCardMeta(activity.starts_at);
  return [
    date,
    withTime ? time : null,
    activity.location_name || null,
    activity.skill_level || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Up to 3 participant avatars, then a "+N" overflow chip.
export function AvatarStrip({
  participants,
}: {
  participants: HostParticipant[];
}) {
  if (participants.length === 0) return null;
  const shown = participants.slice(0, 3);
  const overflow = participants.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div
          key={p.id}
          className={`w-7 h-7 rounded-full overflow-hidden bg-brand-avatar-bg border border-brand-surface flex items-center justify-center flex-none ${
            i > 0 ? "-ml-2" : ""
          }`}
        >
          {p.profiles?.avatar_url ? (
            <Image
              src={p.profiles.avatar_url}
              alt=""
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-semibold text-brand-avatar-text">
              {getInitials(p.profiles?.full_name)}
            </span>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className="-ml-2 w-7 h-7 rounded-full bg-brand-avatar-bg border border-brand-surface flex items-center justify-center text-[10px] font-semibold text-brand-avatar-text flex-none">
          +{overflow}
        </div>
      )}
    </div>
  );
}
