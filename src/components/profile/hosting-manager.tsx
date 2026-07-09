"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import type { HostedActivity, HostParticipantProfile } from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import ShareStoryModal from "@/components/ui/share-story-modal";
import GroupChatModal, {
  type GroupChatParticipant,
} from "@/components/activities/group-chat-modal";
import {
  EditIcon,
  CopyIcon,
  CheckIcon,
  RefreshIcon,
  ShareIcon,
  InstagramIcon,
} from "@/components/ui/icons";
import {
  AvatarStrip,
  CardShell,
  CancelledCard,
  ActivitySection,
  formatCardMeta,
  metaLine,
} from "@/components/profile/activity-card-parts";
import { getSiteUrl } from "@/lib/utils/site-url";
import { isIOSDevice } from "@/lib/utils/platform";
import { COPY_FEEDBACK_MS } from "@/lib/brand";
import { repeatActivity } from "@/lib/actions/activities";
import { useRealtimeParticipants } from "@/hooks/use-realtime-participants";
import {
  splitActivitiesByTime,
  isCancelled,
  joinedCount,
  hostParticipantLine,
  cancelledParticipantLine,
} from "@/lib/utils/hosting";

const PARTICIPANT_COLUMNS = "full_name, avatar_url, username, instagram_handle";

// Card action button. Icon-only below md (square, aria-label carries the name),
// icon + visible label from md up. Density only: no layout/structure change.
function ActionButton({
  label,
  icon,
  tier = "btn-tier-3",
  href,
  onClick,
  style,
}: {
  label: string;
  icon: ReactNode;
  tier?: string;
  href?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const cls = `${tier} text-sm flex items-center justify-center gap-1.5 h-10 w-10 md:h-auto md:w-auto`;
  const inner = (
    <>
      {icon}
      <span className="hidden md:inline">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} aria-label={label} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} aria-label={label} className={cls} style={style}>
      {inner}
    </button>
  );
}

// ── Upcoming (open) management card ────────────────────────────────────────────

function UpcomingCard({
  activity,
  hostId,
  isOwner,
}: {
  activity: HostedActivity;
  hostId: string;
  isOwner: boolean;
}) {
  const { participants, participantCount } =
    useRealtimeParticipants<HostParticipantProfile>({
      activityId: activity.id,
      initialParticipants: activity.participants,
      profileColumns: PARTICIPANT_COLUMNS,
    });

  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const others = joinedCount(participants, hostId);
  const isPrivate = activity.visibility === "private";
  const line = hostParticipantLine(
    participantCount,
    activity.max_participants,
    others,
  );

  async function handleCopy() {
    await navigator.clipboard
      .writeText(`${getSiteUrl()}/activity/${activity.id}`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  // Mirrors the share flow elsewhere: generate the card image and copy the
  // link, then open the shared ShareStoryModal.
  async function handleShare() {
    const activityUrl = `${getSiteUrl()}/activity/${activity.id}`;
    const cardUrl = `/api/activity/${activity.id}/card`;
    if (isIOSDevice()) {
      window.open(cardUrl, "_blank");
    } else {
      try {
        const res = await fetch(cardUrl);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `rally-${activity.id}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch {
        // best-effort; still show modal
      }
    }
    await navigator.clipboard.writeText(activityUrl).catch(() => {});
    setShowShareModal(true);
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

  const isPrivateCopy = isPrivate;
  const copyLabel = copied
    ? "Copied"
    : isPrivateCopy
      ? "Copy invite link"
      : "Copy link";
  const copyTier = isPrivateCopy ? "btn-tier-2" : "btn-tier-3";
  const copyStyle = isPrivateCopy
    ? { borderColor: "var(--color-brand-private-border)" }
    : undefined;

  const actionRow = (
    <div className="flex items-center gap-2 flex-wrap">
      <ActionButton
        tier="btn-tier-2"
        href={`/activity/${activity.id}/edit`}
        label="Edit"
        icon={<EditIcon size={16} />}
      />
      <ActionButton
        tier={copyTier}
        onClick={handleCopy}
        style={copyStyle}
        label={copyLabel}
        icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      />
      <ActionButton
        onClick={() => setShowGroupChat(true)}
        label="Group chat"
        icon={<InstagramIcon size={16} />}
      />
      <ActionButton
        onClick={handleShare}
        label="Share to Story"
        icon={<ShareIcon size={16} />}
      />
    </div>
  );

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

      {/* Row 2: meta + (desktop) description */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-brand-muted">{metaLine(activity, true)}</p>
        {activity.description && (
          <p className="hidden md:block text-xs text-brand-muted line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>

      {/* Action row (owner only) */}
      {isOwner && (
        <div className="border-t border-brand-border/70 pt-3">{actionRow}</div>
      )}

      <GroupChatModal
        participants={groupChatParticipants}
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
      />
      <AnimatePresence>
        {showShareModal && (
          <ShareStoryModal onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </CardShell>
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
}: {
  activities: HostedActivity[];
  isOwner: boolean;
  hostId: string;
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
                  footer={
                    <p className="text-xs text-brand-muted">
                      {cancelledParticipantLine(
                        joinedCount(a.participants, hostId),
                      )}
                    </p>
                  }
                />
              ) : (
                <UpcomingCard
                  key={a.id}
                  activity={a}
                  hostId={hostId}
                  isOwner={isOwner}
                />
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
              <PastCard
                key={a.id}
                activity={a}
                hostId={hostId}
                isOwner={isOwner}
              />
            ))}
          </div>
        </ActivitySection>
      )}
    </div>
  );
}
