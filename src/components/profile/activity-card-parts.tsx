import type { ReactNode } from "react";
import Image from "next/image";
import type { HostParticipant } from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import { getInitials } from "@/lib/utils/avatar";

// Shared presentation used by the Hosting and Attending management cards.

// The column card surface. gap/opacity come from the caller via className.
export function CardShell({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-brand-surface/70 rounded-xl border border-brand-border/80 p-4 flex flex-col ${className}`}
    >
      {children}
    </div>
  );
}

// Rotating disclosure chevron.
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : undefined,
        transition: "transform 0.15s",
      }}
    >
      <path
        d="M1 1L5 5L9 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "Upcoming (N)" / "Past (N)" section. Static header, or a collapsible toggle
// with a chevron when onToggle is passed.
export function ActivitySection({
  title,
  count,
  collapsible = false,
  open = true,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {collapsible ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors w-fit"
        >
          {title} ({count})
          <Chevron open={open} />
        </button>
      ) : (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {title} ({count})
        </h3>
      )}
      {(!collapsible || open) && children}
    </section>
  );
}

// Cancelled activity card. footer is the manager-specific line (joined count
// for hosting, host line for attending).
export function CancelledCard({
  activity,
  footer,
}: {
  activity: {
    sport: string;
    title: string;
    starts_at: string;
    location_name: string;
    skill_level: string | null;
  };
  footer?: ReactNode;
}) {
  return (
    <CardShell className="gap-2 opacity-70">
      <div className="flex items-center gap-2 flex-wrap">
        <ActivityPill sport={activity.sport} />
        <span className="tag-private text-[11px] font-semibold px-2 py-0.5 rounded-full">
          Cancelled
        </span>
      </div>
      <p className="text-base font-semibold text-brand-muted line-through leading-snug">
        {activity.title}
      </p>
      <p className="text-xs text-brand-muted">{metaLine(activity, true)}</p>
      {footer}
    </CardShell>
  );
}

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
