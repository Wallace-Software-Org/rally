"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const ActivityMiniMap = dynamic(
  () => import("@/components/map/activity-mini-map"),
  { ssr: false },
);
import Image from "next/image";
import type { ActivityDetail } from "@/types";
import { joinActivity, leaveActivity } from "@/lib/actions/activities";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import ActivityPill from "@/components/ui/activity-pill";
import MetaPill from "@/components/ui/meta-pill";
import ShareStoryModal from "@/components/ui/share-story-modal";
import GroupChatModal from "@/components/activities/group-chat-modal";
import BackButton from "@/components/ui/back-button";
import {
  getParticipantsWithHostFirst,
  quickJoinLoginHref,
} from "@/lib/utils/activity-participants";
import { getInitials, shouldBlurAvatarForViewer } from "@/lib/utils/avatar";
import { isIOSDevice } from "@/lib/utils/platform";

function formatDetailDate(startsAt: string): string {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${time}`;
}

function Avatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${dim} relative rounded-full flex-none overflow-hidden bg-brand-avatar-bg flex items-center justify-center`}
    >
      {url ? (
        <Image src={url} alt="" fill className="object-cover" />
      ) : (
        <span className="font-semibold text-brand-avatar-text">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-brand-border" />;
}

function useRealtimeParticipantCount(activity: ActivityDetail) {
  const initialCount = activity.participants.length;
  const [participantState, setParticipantState] = useState(() => ({
    activityId: activity.id,
    initialCount,
    count: initialCount,
  }));
  const participantCount =
    participantState.activityId === activity.id &&
    participantState.initialCount === initialCount
      ? participantState.count
      : initialCount;

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    function updateParticipantCount(update: (count: number) => number) {
      setParticipantState((state) => {
        const currentCount =
          state.activityId === activity.id &&
          state.initialCount === initialCount
            ? state.count
            : initialCount;

        return {
          activityId: activity.id,
          initialCount,
          count: update(currentCount),
        };
      });
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
            updateParticipantCount((count) => count + 1);
          }

          if (payload.eventType === "DELETE") {
            updateParticipantCount((count) => Math.max(0, count - 1));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activity.id, initialCount]);

  return participantCount;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">
      {children}
    </p>
  );
}

function LocationButton({
  locationName,
  lat,
  lng,
}: {
  locationName: string;
  lat: number | null;
  lng: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  async function copyAddress() {
    await navigator.clipboard.writeText(locationName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const appleUrl =
    lat != null && lng != null
      ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(locationName)}`
      : `https://maps.apple.com/?q=${encodeURIComponent(locationName)}`;
  const googleUrl =
    lat != null && lng != null
      ? `https://maps.google.com/?q=${lat},${lng}`
      : `https://maps.google.com/?q=${encodeURIComponent(locationName)}`;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-2 text-brand-muted hover:text-brand-teal transition-colors group"
        >
          <svg
            width="10"
            height="12"
            viewBox="0 0 8 10"
            fill="currentColor"
            className="flex-none text-brand-teal/70 group-hover:text-brand-teal transition-colors"
            aria-hidden="true"
          >
            <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
          <span className="group-hover:underline">{locationName}</span>
        </button>
        <span className="text-brand-muted/50 select-none">·</span>
        <button
          onClick={() => setOpen((p) => !p)}
          className="text-brand-teal hover:underline cursor-pointer"
        >
          Get directions
        </button>
      </div>

      {/* Mobile: overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile: bottom sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-bg rounded-t-2xl p-4 flex flex-col gap-2"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="w-9 h-1 bg-brand-border rounded-full mx-auto mb-1" />
            <button
              onClick={copyAddress}
              className="w-full flex items-center justify-center rounded-xl bg-brand-surface border border-brand-border py-3.5 text-sm font-medium text-brand-text hover:bg-brand-surface-deep transition-colors"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <a
              href={appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center rounded-xl bg-brand-surface border border-brand-border py-3.5 text-sm font-medium text-brand-text hover:bg-brand-surface-deep transition-colors"
            >
              Open in Apple Maps
            </a>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center rounded-xl bg-brand-surface border border-brand-border py-3.5 text-sm font-medium text-brand-text hover:bg-brand-surface-deep transition-colors"
            >
              Open in Google Maps
            </a>
            <button
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center py-3 text-sm text-brand-muted"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: popover */}
      {open && (
        <div className="hidden md:block absolute top-full mt-1.5 left-0 z-50 w-max min-w-48 bg-brand-bg border border-brand-border rounded-xl shadow-lg py-1 overflow-hidden">
          <button
            onClick={copyAddress}
            className="w-full flex items-center px-4 py-2.5 text-sm text-brand-text hover:bg-brand-surface transition-colors text-left"
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          <a
            href={appleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-brand-text hover:bg-brand-surface transition-colors"
          >
            Open in Apple Maps
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-brand-text hover:bg-brand-surface transition-colors"
          >
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

export default function ActivityDetailView({
  activity,
  userId,
  showPostedBanner: initialShowPostedBanner = false,
  justJoined = false,
  viewerProfile = null,
}: {
  activity: ActivityDetail;
  userId: string | null;
  showPostedBanner?: boolean;
  justJoined?: boolean;
  viewerProfile?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    instagram_handle: string | null;
  } | null;
}) {
  const initiallyJoined = activity.participants.some(
    (p) => p.user_id === userId,
  );
  const [isJoined, setIsJoined] = useState(initiallyJoined);
  // Participants are held in state (not read straight from the prop) so the
  // "Who's going" stack can re-render when the viewer joins or leaves. The
  // realtime count hook only tracks a number and can't drive the avatar list.
  const [participants, setParticipants] = useState(activity.participants);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPostedBanner, setShowPostedBanner] = useState(
    initialShowPostedBanner,
  );
  const [showJustJoinedBanner, setShowJustJoinedBanner] = useState(justJoined);

  useEffect(() => {
    if (!leaveConfirm) return;
    function onOutside(e: MouseEvent) {
      if (!(e.target as Element).closest?.("[data-leave-btn]")) {
        setLeaveConfirm(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [leaveConfirm]);

  useEffect(() => {
    if (!initialShowPostedBanner) return;

    function hidePostedBanner() {
      setShowPostedBanner(false);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("posted");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );

    window.addEventListener("pagehide", hidePostedBanner);
    return () => window.removeEventListener("pagehide", hidePostedBanner);
  }, [initialShowPostedBanner]);

  useEffect(() => {
    if (!justJoined) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("joined");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [justJoined]);

  const isHost = userId === activity.creator_id;
  const viewerCanSeeProfiles = isHost || isJoined;
  const participantCount = useRealtimeParticipantCount(activity);
  const spotsLeft =
    activity.max_participants === null
      ? null
      : Math.max(0, activity.max_participants - participantCount);
  const hostParticipantProfile = {
    full_name: activity.host.full_name,
    avatar_url: activity.host.avatar_url,
    instagram_handle: activity.host.instagram_handle,
    username: activity.host.username,
  };
  const goingParticipants = getParticipantsWithHostFirst({
    participants,
    creatorId: activity.creator_id,
    hostProfile: hostParticipantProfile,
    createHostParticipant: (profile) => ({
      id: `host-${activity.creator_id}`,
      user_id: activity.creator_id,
      profiles: profile,
    }),
  });
  // Group-chat roster: confirmed participants only, host excluded.
  const groupChatRoster = participants
    .filter((p) => p.user_id !== activity.creator_id)
    .map((p) => ({
      id: p.id,
      full_name: p.profiles?.full_name ?? "",
      username: p.profiles?.username ?? null,
      avatar_url: p.profiles?.avatar_url ?? null,
      instagram_handle: p.profiles?.instagram_handle ?? null,
    }));
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const skillDisplay = activity.skill_level
    ? activity.skill_level.charAt(0).toUpperCase() +
      activity.skill_level.slice(1)
    : "All levels";
  async function handleJoin() {
    if (!userId || joining || isJoined) return;
    setJoining(true);
    const { error } = await joinActivity(activity.id);
    if (!error) {
      setIsJoined(true);
      // Optimistically add the viewer to "Who's going" so their avatar appears
      // immediately. Prefer their original participant entry if they left this
      // session; otherwise build one from viewerProfile.
      setParticipants((prev) => {
        if (prev.some((p) => p.user_id === userId)) return prev;
        const original = activity.participants.find(
          (p) => p.user_id === userId,
        );
        if (original) return [...prev, original];
        if (viewerProfile) {
          return [
            ...prev,
            {
              id: `viewer-${userId}`,
              user_id: userId,
              profiles: {
                full_name: viewerProfile.full_name ?? "",
                avatar_url: viewerProfile.avatar_url,
                instagram_handle: null,
                username: viewerProfile.username,
              },
            },
          ];
        }
        return prev;
      });
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!userId || leaving || !isJoined) return;
    setLeaving(true);
    const { error } = await leaveActivity(activity.id);
    if (!error) {
      setIsJoined(false);
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
    }
    setLeaving(false);
    setLeaveConfirm(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleShare() {
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
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShowShareModal(true);
  }

  // ── CTA — rendered in bottom bar (mobile), inline (md/lg), right panel (xl)
  const ctaButton = isHost ? (
    <Link
      href={`/activity/${activity.id}/edit`}
      className="btn-tier-1 w-full max-w-156 flex items-center justify-center active:bg-brand-teal-active transition-colors"
    >
      Edit
    </Link>
  ) : isJoined ? (
    <button
      data-leave-btn
      onClick={() => (leaveConfirm ? handleLeave() : setLeaveConfirm(true))}
      className={`cursor-pointer w-full max-w-156 flex items-center justify-center rounded-xl text-sm font-semibold py-3.5 transition-colors border ${
        leaveConfirm
          ? "border-brand-danger text-brand-danger bg-transparent hover:bg-brand-danger/5"
          : "border-brand-teal text-brand-teal bg-transparent hover:bg-brand-teal/5"
      }`}
    >
      {leaving ? "Leaving…" : leaveConfirm ? "Leave activity?" : "Going ✓"}
    </button>
  ) : userId === null ? (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-156">
      <Link
        href={quickJoinLoginHref(activity.id)}
        className="w-full flex items-center justify-center rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
      >
        Sign in to join
      </Link>
      <p className="text-xs text-center text-brand-muted">
        Sign in with Google to join.
      </p>
    </div>
  ) : isFull ? (
    <button
      disabled
      className="w-full max-w-156 flex items-center justify-center rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 transition-colors disabled:opacity-60"
    >
      Full
    </button>
  ) : (
    <button
      onClick={handleJoin}
      disabled={joining}
      className="btn-tier-1 cursor-pointer w-full max-w-156 flex items-center justify-center active:bg-brand-teal-active transition-colors disabled:opacity-60"
    >
      {joining ? "Joining…" : "Join activity"}
    </button>
  );

  const shareBtn = (tier: string) =>
    userId ? (
      <button
        onClick={handleShare}
        className={`${tier} cursor-pointer w-full max-w-156 flex items-center justify-center gap-1.5 transition-colors`}
      >
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
        Share to Story
      </button>
    ) : null;

  const groupChatBtn = (tier: string) =>
    isHost ? (
      <button
        onClick={() => setShowGroupChatModal(true)}
        className={`${tier} cursor-pointer w-full max-w-156 flex items-center justify-center gap-1.5 transition-colors`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1M16.5 9.5a2.5 2.5 0 1 0 0-5M17 14h.5a4 4 0 0 1 4 4v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Invite to group chat
      </button>
    ) : null;

  // Host-only, shown on all activities (public and private) so any host can
  // grab a shareable link. Uses a neutral tier to match the sibling actions.
  const copyLinkBtn = (tier: string) =>
    isHost ? (
      <button
        onClick={handleCopyLink}
        className={`${tier} cursor-pointer w-full max-w-156 flex items-center justify-center gap-2 transition-colors`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="9"
            width="11"
            height="11"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {linkCopied ? "Copied!" : "Copy invite link"}
      </button>
    ) : null;

  // Nudge joined participants who have no Instagram handle to add one, so hosts
  // can pull them into a group chat. Hidden once a handle exists.
  const viewerHasInstagram = Boolean(viewerProfile?.instagram_handle?.trim());
  const showInstagramNudge = isJoined && !!viewerProfile && !viewerHasInstagram;
  const instagramNudge = showInstagramNudge ? (
    <div className="w-full max-w-156 rounded-xl border-[0.5px] border-brand-teal bg-brand-teal/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-brand-teal">
      <span className="font-medium">
        Add your Instagram so hosts can invite you to a group chat.
      </span>
      <Link
        href="/profile/edit"
        className="rounded-lg border border-brand-teal px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-teal/10 transition-colors whitespace-nowrap"
      >
        Add Instagram
      </Link>
    </div>
  ) : null;

  const registerBtn = (tier: string) =>
    userId && activity.external_link ? (
      <a
        href={activity.external_link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${tier} w-full max-w-156 flex items-center justify-center gap-1.5 transition-colors`}
      >
        <ExternalLinkIcon />
        Register here
      </a>
    ) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {/* Fixed floating back button (mobile) — overlays content, arrives via feed */}
      <BackButton />
      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="page-with-back flex-1 overflow-y-auto px-3">
        {showPostedBanner && (
          <div className="px-4 pt-4 xl:px-8 md:pt-8 max-w-4xl xl:max-w-5xl git add ..mx-auto w-full">
            <div className="relative rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 pr-12 text-sm font-medium text-brand-teal flex flex-wrap items-center justify-between gap-3">
              <span>Your activity is live.</span>
              {userId && (
                <div className="flex items-center justify-end gap-2 flex-none">
                  <button
                    onClick={handleShare}
                    className="rounded-lg border border-brand-teal px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-teal/10 transition-colors whitespace-nowrap"
                  >
                    Share to Story
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowPostedBanner(false)}
                aria-label="Dismiss"
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-brand-teal hover:bg-brand-teal/10 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}
        {showJustJoinedBanner && (
          <div className="px-4 pt-4 xl:px-8 xl:max-w-5xl xl:mx-auto w-full">
            <div className="relative rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 pr-12 text-sm text-brand-teal">
              You&apos;re in.{" "}
              <Link href="/onboarding" className="underline">
                Finish setting up your profile
              </Link>{" "}
              when you&apos;re ready.
              <button
                onClick={() => setShowJustJoinedBanner(false)}
                aria-label="Dismiss"
                className="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 flex items-center justify-center rounded-full text-brand-teal hover:bg-brand-teal/10 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}
        {/* xl: max-width wrapper with flex row; md/lg: centered single column */}
        <div className="xl:max-w-5xl xl:mx-auto xl:px-8 xl:flex xl:items-start xl:gap-10 xl:pt-8">
          {/* ── Main content column ─────────────────────────────────────────── */}
          <div className="flex-1 max-w-2xl mx-auto px-4 md:px-6 xl:max-w-none xl:mx-0 xl:px-0 py-6 flex flex-col gap-6">
            {/* 1. Header */}
            <div className="flex flex-col gap-3">
              <ActivityPill sport={activity.sport} />
              <h1 className="text-2xl font-medium text-brand-text leading-snug">
                {activity.title}
              </h1>
              <p className="flex items-center gap-2 text-sm text-brand-muted">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className="flex-none"
                >
                  <rect
                    x="1"
                    y="2"
                    width="12"
                    height="11"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M1 5h12M5 1v2M9 1v2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                {activity.starts_at
                  ? formatDetailDate(activity.starts_at)
                  : "Date and time not set"}
              </p>
              {/* Location row — xl only (map stays in right panel) */}
              {activity.location_name && (
                <div className="hidden xl:flex">
                  <LocationButton
                    locationName={activity.location_name}
                    lat={activity.lat}
                    lng={activity.lng}
                  />
                </div>
              )}
            </div>

            <Divider />

            {/* 2. Hosted by */}
            <div>
              <SectionLabel>Hosted by</SectionLabel>
              <div className="flex items-center gap-3">
                {activity.host.username ? (
                  <Link href={`/profile/${activity.host.username}`}>
                    <Avatar
                      url={activity.host.avatar_url}
                      name={activity.host.full_name}
                      size="md"
                    />
                  </Link>
                ) : (
                  <Avatar
                    url={activity.host.avatar_url}
                    name={activity.host.full_name}
                    size="md"
                  />
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-text leading-none">
                    {activity.host.full_name}
                  </p>
                  {activity.host.instagram_handle && (
                    <p className="text-xs text-brand-muted">
                      @{activity.host.instagram_handle}
                    </p>
                  )}
                  <MetaPill>{activity.hosted_count} activities hosted</MetaPill>
                </div>
              </div>
            </div>

            <Divider />

            {/* 3. About + meta pills */}
            <div>
              <SectionLabel>About</SectionLabel>
              <p className="text-base xl:text-sm leading-relaxed text-brand-text">
                {activity.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <MetaPill>{skillDisplay}</MetaPill>
                <MetaPill>
                  {spotsLeftText(activity.max_participants, participantCount)}
                </MetaPill>
                {activity.visibility === "private" && (
                  <MetaPill>Private</MetaPill>
                )}
              </div>
            </div>

            {/* 4. Location — mobile + md/lg only; owns its top divider so xl stays clean */}
            <div className="xl:hidden flex flex-col gap-3">
              <div className="h-px bg-brand-border" />
              <SectionLabel>Location</SectionLabel>
              {activity.location_name && (
                <LocationButton
                  locationName={activity.location_name}
                  lat={activity.lat}
                  lng={activity.lng}
                />
              )}
              {typeof activity.lat === "number" &&
              typeof activity.lng === "number" ? (
                <div className="rounded-xl overflow-hidden h-44">
                  <ActivityMiniMap lat={activity.lat} lng={activity.lng} />
                </div>
              ) : (
                <div className="rounded-xl h-44 bg-brand-map-bg flex items-center justify-center">
                  <span className="text-sm text-brand-muted">
                    Location not available
                  </span>
                </div>
              )}
            </div>

            <Divider />

            {/* 5. Who's going */}
            <div>
              <SectionLabel>Who&apos;s going</SectionLabel>
              {goingParticipants.length === 0 ? (
                <p className="text-sm text-brand-muted">
                  No one yet — be the first
                </p>
              ) : (
                <>
                  {/* Mobile: horizontal scroll row */}
                  <div className="md:hidden relative">
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {goingParticipants.map((p) => {
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        const shouldBlurAvatar = shouldBlurAvatarForViewer(
                          userId,
                          p.user_id === activity.creator_id,
                        );
                        const avatarEl = (
                          <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-brand-avatar-bg">
                            {p.profiles?.avatar_url ? (
                              <Image
                                src={p.profiles.avatar_url}
                                alt=""
                                fill
                                className={`object-cover${
                                  shouldBlurAvatar ? " blur-sm" : ""
                                }`}
                              />
                            ) : (
                              <span
                                className={`text-xs font-semibold text-brand-avatar-text${
                                  shouldBlurAvatar ? " blur-sm" : ""
                                }`}
                              >
                                {getInitials(name)}
                              </span>
                            )}
                          </div>
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1.5 flex-none w-13"
                          >
                            {viewerCanSeeProfiles && p.profiles?.username ? (
                              <Link href={`/profile/${p.profiles.username}`}>
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            {userId && (
                              <span className="text-sm xl:text-xs text-brand-text truncate w-full text-center leading-tight">
                                {firstName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-brand-bg pointer-events-none" />
                  </div>

                  {/* md+: horizontal scroll row */}
                  <div className="hidden md:block relative">
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {goingParticipants.map((p) => {
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        const shouldBlurAvatar = shouldBlurAvatarForViewer(
                          userId,
                          p.user_id === activity.creator_id,
                        );
                        const avatarEl = (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-brand-avatar-bg">
                            {p.profiles?.avatar_url ? (
                              <Image
                                src={p.profiles.avatar_url}
                                alt=""
                                fill
                                className={`object-cover${
                                  shouldBlurAvatar ? " blur-sm" : ""
                                }`}
                              />
                            ) : (
                              <span
                                className={`text-xs font-semibold text-brand-avatar-text${
                                  shouldBlurAvatar ? " blur-sm" : ""
                                }`}
                              >
                                {getInitials(name)}
                              </span>
                            )}
                          </div>
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1 flex-none w-13"
                          >
                            {viewerCanSeeProfiles && p.profiles?.username ? (
                              <Link href={`/profile/${p.profiles.username}`}>
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            {userId && (
                              <span className="text-sm xl:text-xs text-brand-text truncate w-full text-center leading-tight">
                                {firstName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-brand-bg pointer-events-none" />
                  </div>
                </>
              )}
            </div>

            {/* 6. Secondary actions — mobile/tablet only; xl keeps them in the right panel */}
            {userId && (
              <div className="xl:hidden flex flex-col items-center gap-3">
                {instagramNudge}
                {copyLinkBtn("btn-tier-2")}
                {registerBtn("btn-tier-2")}
                {shareBtn("btn-tier-2")}
                {groupChatBtn("btn-tier-2")}
              </div>
            )}
          </div>

          {/* ── Right sticky panel — xl only ────────────────────────────────── */}
          <div className="hidden xl:flex flex-col gap-4 w-72 flex-none sticky top-8 py-6">
            {typeof activity.lat === "number" &&
            typeof activity.lng === "number" ? (
              <div className="rounded-xl overflow-hidden h-52">
                <ActivityMiniMap lat={activity.lat} lng={activity.lng} />
              </div>
            ) : (
              <div className="rounded-xl h-52 bg-brand-map-bg flex items-center justify-center">
                <span className="text-sm text-brand-muted">
                  Location not available
                </span>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {ctaButton}
              {copyLinkBtn("btn-tier-2")}
              {registerBtn("btn-tier-2")}
              {shareBtn("btn-tier-2")}
              {groupChatBtn("btn-tier-2")}
              {instagramNudge}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA bar — mobile/tablet only ────────────────────────────────────── */}
      <div className="xl:hidden flex-none border-t border-brand-border bg-brand-bg p-3 flex flex-col items-center gap-2">
        {ctaButton}
      </div>

      <AnimatePresence>
        {showShareModal && (
          <ShareStoryModal onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>

      {isHost && (
        <GroupChatModal
          participants={groupChatRoster}
          isOpen={showGroupChatModal}
          onClose={() => setShowGroupChatModal(false)}
        />
      )}
    </div>
  );
}
