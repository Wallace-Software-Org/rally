"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type {
  AttendedActivity,
  AttendedHost,
  HostParticipantProfile,
} from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import {
  AvatarStrip,
  CardShell,
  CancelledCard,
  ActivitySection,
  formatCardMeta,
  metaLine,
} from "@/components/profile/activity-card-parts";
import { getInitials } from "@/lib/utils/avatar";
import { leaveActivity } from "@/lib/actions/activities";
import { useRealtimeParticipants } from "@/hooks/use-realtime-participants";
import {
  splitActivitiesByTime,
  isCancelled,
  capacityLine,
} from "@/lib/utils/hosting";

const PARTICIPANT_COLUMNS = "full_name, avatar_url, username, instagram_handle";

// ── Host line ─────────────────────────────────────────────────────────────────

function HostLine({ host }: { host: AttendedHost | null }) {
  if (!host) return null;
  const inner = (
    <>
      <span className="w-5 h-5 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center flex-none">
        {host.avatar_url ? (
          <Image
            src={host.avatar_url}
            alt=""
            width={20}
            height={20}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[9px] font-semibold text-brand-avatar-text">
            {getInitials(host.full_name)}
          </span>
        )}
      </span>
      <span className="truncate">Hosted by {host.full_name}</span>
    </>
  );
  return host.username ? (
    <Link
      href={`/profile/${host.username}`}
      className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors w-fit"
    >
      {inner}
    </Link>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-brand-muted w-fit">
      {inner}
    </span>
  );
}

// ── Upcoming (open) attending card ─────────────────────────────────────────────

function UpcomingCard({
  activity,
  isOwner,
}: {
  activity: AttendedActivity;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { participants, participantCount } =
    useRealtimeParticipants<HostParticipantProfile>({
      activityId: activity.id,
      initialParticipants: activity.participants,
      profileColumns: PARTICIPANT_COLUMNS,
    });

  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [left, setLeft] = useState(false);

  const isPrivate = activity.visibility === "private";
  const line = capacityLine(participantCount, activity.max_participants);

  async function handleLeave() {
    setLeaving(true);
    const { error } = await leaveActivity(activity.id);
    if (error) {
      setLeaving(false);
      setConfirming(false);
      return;
    }
    setLeft(true);
    router.refresh();
  }

  // Optimistically drop the card once the viewer leaves; the refetch confirms.
  if (left) return null;

  return (
    <CardShell className="gap-3">
      {/* Row 1: identity + capacity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ActivityPill sport={activity.sport} />
            {isPrivate && (
              <span className="tag-private text-[11px] font-semibold px-2 py-0.5 rounded-full">
                Private
              </span>
            )}
          </div>
          <Link
            href={`/activity/${activity.id}`}
            className="text-base font-semibold text-brand-text leading-snug line-clamp-2 hover:underline"
          >
            {activity.title}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1 flex-none">
          <AvatarStrip participants={participants} />
          <span
            className={`text-xs font-medium ${
              line.tone === "teal" ? "text-brand-teal" : "text-brand-muted"
            }`}
          >
            {line.text}
          </span>
        </div>
      </div>

      {/* Row 2: meta + host + (md) description */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-brand-muted">{metaLine(activity, true)}</p>
        <HostLine host={activity.host} />
        {activity.description && (
          <p className="hidden md:block text-xs text-brand-muted line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>

      {/* Leave (owner only) */}
      {isOwner && (
        <div className="border-t border-brand-border/70 pt-3">
          {confirming ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-brand-muted">
                Leave this activity?
              </span>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="btn-tier-3 text-sm"
              >
                {leaving ? "Leaving..." : "Yes, leave"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-sm text-brand-muted hover:text-brand-text transition-colors px-2"
              >
                Stay
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="btn-tier-3 text-sm w-fit"
            >
              Leave
            </button>
          )}
        </div>
      )}
    </CardShell>
  );
}

// ── Past card (compact) ───────────────────────────────────────────────────────

function PastCard({ activity }: { activity: AttendedActivity }) {
  const cancelled = isCancelled(activity);
  const { date } = formatCardMeta(activity.starts_at);
  const meta = [
    date,
    activity.location_name || null,
    activity.host ? `hosted by ${activity.host.full_name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="flex items-center justify-between gap-3 bg-brand-surface/70 rounded-xl border border-brand-border/80 px-4 py-3 opacity-[0.85]"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            cancelled ? "text-brand-muted line-through" : "text-brand-text"
          }`}
        >
          {activity.title}
        </p>
        <p className="text-xs text-brand-muted truncate">{meta}</p>
      </div>
    </div>
  );
}

// ── Attending manager ─────────────────────────────────────────────────────────

export default function AttendingManager({
  activities,
  isOwner,
}: {
  activities: AttendedActivity[];
  isOwner: boolean;
}) {
  const [pastOpen, setPastOpen] = useState(false);

  // Non-owners never see cancelled activities on someone else's profile.
  const visible = isOwner
    ? activities
    : activities.filter((a) => !isCancelled(a));
  const { upcoming, past } = splitActivitiesByTime(visible);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <p className="py-10 text-sm text-brand-muted text-center leading-relaxed">
        {isOwner ? (
          <>
            You aren&apos;t attending anything yet.{" "}
            <Link href="/" className="text-brand-teal hover:underline">
              Find something on the feed.
            </Link>
          </>
        ) : (
          "Not attending anything yet."
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ActivitySection title="Upcoming" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-brand-muted">Nothing coming up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((a) =>
              isCancelled(a) ? (
                <CancelledCard
                  key={a.id}
                  activity={a}
                  footer={<HostLine host={a.host} />}
                />
              ) : (
                <UpcomingCard key={a.id} activity={a} isOwner={isOwner} />
              ),
            )}
          </div>
        )}
      </ActivitySection>

      {past.length > 0 && (
        <ActivitySection
          title="Past"
          count={past.length}
          collapsible
          open={pastOpen}
          onToggle={() => setPastOpen((p) => !p)}
        >
          <div className="flex flex-col gap-2">
            {past.map((a) => (
              <PastCard key={a.id} activity={a} />
            ))}
          </div>
        </ActivitySection>
      )}
    </div>
  );
}
