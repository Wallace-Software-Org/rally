"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type {
  HostedActivity,
  HostParticipant,
  HostParticipantProfile,
} from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import GroupChatModal, {
  type GroupChatParticipant,
} from "@/components/activities/group-chat-modal";
import {
  EditIcon,
  CopyIcon,
  RefreshIcon,
  InstagramIcon,
} from "@/components/ui/icons";
import { getInitials } from "@/lib/utils/avatar";
import { getSiteUrl } from "@/lib/utils/site-url";
import { cancelActivity, repeatActivity } from "@/lib/actions/activities";
import { useRealtimeParticipants } from "@/hooks/use-realtime-participants";
import {
  splitHostedActivities,
  isCancelled,
  joinedCount,
  hostParticipantLine,
  cancelledParticipantLine,
} from "@/lib/utils/hosting";

const PARTICIPANT_COLUMNS = "full_name, avatar_url, username, instagram_handle";

type Variant = "mobile" | "desktop";

function formatCardMeta(startsAt: string): { date: string; time: string } {
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

function metaLine(activity: HostedActivity, withTime: boolean): string {
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

// ── Avatar strip ──────────────────────────────────────────────────────────────

function AvatarStrip({ participants }: { participants: HostParticipant[] }) {
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

// ── Cancelled card ────────────────────────────────────────────────────────────

function CancelledCard({
  activity,
  others,
}: {
  activity: HostedActivity;
  others: number;
}) {
  return (
    <div className="bg-brand-surface/70 rounded-xl border border-brand-border/80 p-4 flex flex-col gap-2 opacity-70">
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
      <p className="text-xs text-brand-muted">
        {cancelledParticipantLine(others)}
      </p>
    </div>
  );
}

// ── Upcoming (open) management card ────────────────────────────────────────────

function UpcomingCard({
  activity,
  hostId,
  isOwner,
  variant,
}: {
  activity: HostedActivity;
  hostId: string;
  isOwner: boolean;
  variant: Variant;
}) {
  const router = useRouter();
  const { participants, participantCount } =
    useRealtimeParticipants<HostParticipantProfile>({
      activityId: activity.id,
      initialParticipants: activity.participants,
      profileColumns: PARTICIPANT_COLUMNS,
    });

  const [cancelled, setCancelled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [copied, setCopied] = useState(false);

  const others = joinedCount(participants, hostId);
  const isPrivate = activity.visibility === "private";
  const line = hostParticipantLine(
    participantCount,
    activity.max_participants,
    others,
  );

  async function handleCancel() {
    setCancelling(true);
    const { error } = await cancelActivity(activity.id);
    if (error) {
      setCancelling(false);
      setConfirming(false);
      return;
    }
    setCancelled(true);
    setConfirming(false);
    setCancelling(false);
    router.refresh();
  }

  async function handleCopy() {
    await navigator.clipboard
      .writeText(`${getSiteUrl()}/activity/${activity.id}`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (cancelled) {
    return <CancelledCard activity={activity} others={others} />;
  }

  const groupChatParticipants: GroupChatParticipant[] = participants.map(
    (p) => ({
      id: p.user_id,
      full_name: p.profiles?.full_name ?? "",
      username: p.profiles?.username ?? null,
      avatar_url: p.profiles?.avatar_url ?? null,
      instagram_handle: p.profiles?.instagram_handle ?? null,
    }),
  );

  const copyLabel = isPrivate ? "Copy invite link" : "Copy link";
  const copyTier = isPrivate ? "btn-tier-2" : "btn-tier-3";
  const copyStyle = isPrivate
    ? { borderColor: "var(--color-brand-private-border)" }
    : undefined;

  const actionRow = variant === "desktop" ? (
    <div className="flex items-center gap-2">
      <Link
        href={`/activity/${activity.id}/edit`}
        className="btn-tier-2 text-sm flex items-center gap-1.5"
      >
        <EditIcon size={14} />
        Edit
      </Link>
      <button
        onClick={handleCopy}
        style={copyStyle}
        className={`${copyTier} text-sm flex items-center gap-1.5`}
      >
        <CopyIcon size={14} />
        {copied ? "Copied!" : copyLabel}
      </button>
      <button
        onClick={() => setShowGroupChat(true)}
        className="btn-tier-3 text-sm flex items-center gap-1.5"
      >
        <InstagramIcon size={14} />
        Group chat
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="ml-auto text-sm font-semibold text-brand-danger hover:opacity-80 transition-opacity px-2"
      >
        Cancel activity
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link
        href={`/activity/${activity.id}/edit`}
        aria-label="Edit"
        className="btn-tier-2 w-10 h-10 !p-0 flex items-center justify-center"
      >
        <EditIcon size={16} />
      </Link>
      <button
        onClick={handleCopy}
        aria-label={copyLabel}
        style={copyStyle}
        className={`${copyTier} w-10 h-10 !p-0 flex items-center justify-center`}
      >
        <CopyIcon size={16} />
      </button>
      <button
        onClick={() => setShowGroupChat(true)}
        aria-label="Group chat"
        className="btn-tier-3 w-10 h-10 !p-0 flex items-center justify-center"
      >
        <InstagramIcon size={16} />
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="ml-auto text-sm font-semibold text-brand-danger hover:opacity-80 transition-opacity px-2"
      >
        Cancel activity
      </button>
    </div>
  );

  return (
    <div className="bg-brand-surface/70 rounded-xl border border-brand-border/80 p-4 flex flex-col gap-3">
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

      {/* Row 2: meta + (desktop) description */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-brand-muted">{metaLine(activity, true)}</p>
        {variant === "desktop" && activity.description && (
          <p className="text-xs text-brand-muted line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>

      {/* Action row (owner only) */}
      {isOwner && (
        <div className="border-t border-brand-border/70 pt-3">
          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-brand-text">
                Cancel this activity? People who joined will see it as
                cancelled.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="btn-tier-danger text-sm"
                >
                  {cancelling ? "Cancelling..." : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="btn-tier-3 text-sm"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            actionRow
          )}
        </div>
      )}

      <GroupChatModal
        participants={groupChatParticipants}
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
      />
    </div>
  );
}

// ── Past card (compact) ───────────────────────────────────────────────────────

function PastCard({
  activity,
  hostId,
  isOwner,
}: {
  activity: HostedActivity;
  hostId: string;
  isOwner: boolean;
}) {
  const [repeating, setRepeating] = useState(false);
  const others = joinedCount(activity.participants, hostId);
  const cancelled = isCancelled(activity);
  const { date } = formatCardMeta(activity.starts_at);
  const meta = [date, activity.location_name || null, `${others} joined`]
    .filter(Boolean)
    .join(" · ");

  async function handleRepeat() {
    setRepeating(true);
    // Redirects to the new activity on success; only returns here on error.
    await repeatActivity(activity.id);
    setRepeating(false);
  }

  return (
    <div
      className="flex items-center justify-between gap-3 bg-brand-surface/70 rounded-xl border border-brand-border/80 px-4 py-3"
      style={{ opacity: 0.85 }}
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
      {isOwner && (
        <button
          onClick={handleRepeat}
          disabled={repeating}
          className="btn-tier-3 text-sm flex items-center gap-1.5 flex-none"
        >
          <RefreshIcon size={14} />
          {repeating ? "Repeating..." : "Repeat"}
        </button>
      )}
    </div>
  );
}

// ── Hosting manager ───────────────────────────────────────────────────────────

export default function HostingManager({
  activities,
  isOwner,
  hostId,
  variant,
}: {
  activities: HostedActivity[];
  isOwner: boolean;
  hostId: string;
  variant: Variant;
}) {
  const [pastOpen, setPastOpen] = useState(false);

  // Non-owners never see cancelled activities on someone else's profile.
  const visible = isOwner
    ? activities
    : activities.filter((a) => !isCancelled(a));
  const { upcoming, past } = splitHostedActivities(visible);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <p className="py-10 text-sm text-brand-muted text-center leading-relaxed">
        {isOwner ? (
          <>
            You haven&apos;t hosted anything yet.{" "}
            <Link
              href="/activity/new"
              className="text-brand-teal hover:underline"
            >
              Post an activity.
            </Link>
          </>
        ) : (
          "No activities hosted yet."
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-brand-muted">Nothing coming up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((a) =>
              isCancelled(a) ? (
                <CancelledCard
                  key={a.id}
                  activity={a}
                  others={joinedCount(a.participants, hostId)}
                />
              ) : (
                <UpcomingCard
                  key={a.id}
                  activity={a}
                  hostId={hostId}
                  isOwner={isOwner}
                  variant={variant}
                />
              ),
            )}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <button
            onClick={() => setPastOpen((p) => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-muted hover:text-brand-text transition-colors w-fit"
          >
            Past ({past.length})
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden="true"
              style={{
                transform: pastOpen ? "rotate(180deg)" : undefined,
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
          </button>
          {pastOpen && (
            <div className="flex flex-col gap-2">
              {past.map((a) => (
                <PastCard
                  key={a.id}
                  activity={a}
                  hostId={hostId}
                  isOwner={isOwner}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
