"use client";

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ActivityWithParticipants } from "@/types";
import { formatActivityTime } from "@/lib/utils/format-time";
import ActivityPill from "@/components/ui/activity-pill";
import ShareStoryModal from "@/components/ui/share-story-modal";

type MapPreviewCardProps = {
  activity: ActivityWithParticipants;
  userId: string | null;
  onJoin: () => Promise<boolean>;
  onLeave: () => Promise<boolean>;
  onDismiss: () => void;
};

export default function MapPreviewCard({
  activity,
  userId,
  onJoin,
  onLeave,
  onDismiss,
}: MapPreviewCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isHost = userId === activity.creator_id;
  const isJoined =
    userId !== null &&
    activity.participants.some((participant) => participant.user_id === userId);

  useEffect(() => {
    if (!confirming) return;
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [confirming]);

  async function handleJoin() {
    if (!userId || isJoining || isJoined) return;
    setIsJoining(true);
    await onJoin();
    setIsJoining(false);
  }

  async function handleLeave() {
    if (!userId || isLeaving || !isJoined) return;
    setIsLeaving(true);
    const didLeave = await onLeave();
    if (didLeave) {
      setConfirming(false);
    }
    setIsLeaving(false);
  }

  async function handleShare() {
    const activityUrl = `${window.location.origin}/activity/${activity.id}`;

    try {
      const res = await fetch(`/api/activity/${activity.id}/card`);
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
      // download best-effort; still show modal
    }

    await navigator.clipboard.writeText(activityUrl).catch(() => {});
    setShowShareModal(true);
  }

  const participantCount = Array.isArray(activity.participants)
    ? activity.participants.length
    : 0;
  const spotsLeft =
    activity.max_participants === null
      ? Infinity
      : activity.max_participants - participantCount;

  const primaryAction = isHost ? (
    <Link
      href={`/activity/${activity.id}/edit`}
      className="btn-tier-1 w-full flex items-center justify-center active:bg-brand-teal-active transition-colors"
    >
      Manage
    </Link>
  ) : userId === null ? (
    <Link
      href="/login"
      className="w-full flex items-center justify-center rounded-xl border border-transparent bg-brand-teal text-white text-sm font-semibold py-3 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
    >
      Sign in to join
    </Link>
  ) : isLeaving ? (
    <button
      disabled
      className="w-full flex items-center justify-center rounded-xl text-sm font-semibold py-3 transition-colors disabled:opacity-50 border border-brand-teal text-brand-teal bg-transparent"
    >
      Leaving…
    </button>
  ) : isJoining ? (
    <button
      disabled
      className="btn-tier-1 w-full flex items-center justify-center active:bg-brand-teal-active transition-colors disabled:opacity-50"
    >
      Joining…
    </button>
  ) : isJoined ? (
    <button
      ref={btnRef}
      onClick={() => (confirming ? handleLeave() : setConfirming(true))}
      disabled={isLeaving}
      className={`cursor-pointer w-full flex items-center justify-center rounded-xl text-sm font-semibold py-3 transition-colors disabled:opacity-50 border ${
        confirming
          ? "border-brand-danger text-brand-danger bg-transparent hover:bg-brand-danger/5"
          : "border-brand-teal text-brand-teal bg-transparent hover:bg-brand-teal/5"
      }`}
    >
      {isLeaving ? "Leaving…" : confirming ? "Leave activity?" : "Going ✓"}
    </button>
  ) : spotsLeft > 0 ? (
    <button
      onClick={handleJoin}
      disabled={isJoining}
      className="btn-tier-1 cursor-pointer w-full flex items-center justify-center active:bg-brand-teal-active transition-colors disabled:opacity-50"
    >
      {isJoining ? "Joining…" : "Join activity"}
    </button>
  ) : (
    <button
      disabled
      className="w-full flex items-center justify-center rounded-xl border border-transparent bg-brand-teal text-white text-sm font-semibold py-3 transition-colors disabled:opacity-60"
    >
      Full
    </button>
  );

  const ghostButtonClass = "btn-tier-3 w-full transition-colors";

  const registerBtn = activity.external_link ? (
    <a
      href={activity.external_link}
      target="_blank"
      rel="noopener noreferrer"
      className={ghostButtonClass}
    >
      <ExternalLinkIcon />
      Register here
    </a>
  ) : null;

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[320px] rounded-2xl bg-brand-bg shadow-xl border border-brand-border p-4 flex flex-col gap-3 z-10">
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-brand-avatar-bg text-brand-muted hover:bg-brand-border transition-colors"
          aria-label="Close"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Activity pill + time */}
        <div className="flex items-center gap-2 pr-8">
          <ActivityPill sport={activity.sport} />
          <span className="text-xs text-brand-muted">
            {formatActivityTime(activity.starts_at)}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-brand-text leading-snug">
          {activity.title}
        </p>

        {/* Location + skill + spots */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-brand-muted flex items-center gap-1">
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
              <span>
                {activity.location_name}
                {activity.skill_level && ` · ${activity.skill_level}`}
              </span>
            ) : (
              <span className="rounded px-1.5 bg-brand-border text-brand-border select-none blur-[2px]">
                ••••••••••••
              </span>
            )}
          </p>
          <p className="text-xs text-brand-muted">
            {activity.max_participants === null
              ? "Open"
              : spotsLeft <= 0
                ? "Full"
                : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {primaryAction}
          <Link
            href={`/activity/${activity.id}`}
            className="btn-tier-2 w-full flex items-center justify-center transition-colors"
          >
            View details
          </Link>
          {registerBtn}
          <button
            onClick={handleShare}
            className={`cursor-pointer ${ghostButtonClass}`}
          >
            <ShareIcon />
            Share to Story
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showShareModal && (
          <ShareStoryModal onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ShareIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12M7 8l5-5 5 5M20 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 5h6m0 0v6m0-6-9 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
