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

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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
          {initials(name)}
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
          state.activityId === activity.id && state.initialCount === initialCount
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

function LocationButton({ locationName, lat, lng }: { locationName: string; lat: number | null; lng: number | null }) {
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

  const appleUrl = lat != null && lng != null
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(locationName)}`
    : `https://maps.apple.com/?q=${encodeURIComponent(locationName)}`;
  const googleUrl = lat != null && lng != null
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
}: {
  activity: ActivityDetail;
  userId: string | null;
  showPostedBanner?: boolean;
}) {
  const initiallyJoined = activity.participants.some(
    (p) => p.user_id === userId,
  );
  const [isJoined, setIsJoined] = useState(initiallyJoined);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showPostedBanner, setShowPostedBanner] = useState(
    initialShowPostedBanner,
  );

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

  const isHost = userId === activity.creator_id;
  const participantCount = useRealtimeParticipantCount(activity);
  const spotsLeft =
    activity.max_participants === null
      ? null
      : Math.max(0, activity.max_participants - participantCount);
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const skillDisplay = activity.skill_level
    ? activity.skill_level.charAt(0).toUpperCase() +
      activity.skill_level.slice(1)
    : "All levels";
  async function handleJoin() {
    if (!userId || joining || isJoined) return;
    setJoining(true);
    const { error } = await joinActivity(activity.id);
    if (!error) setIsJoined(true);
    setJoining(false);
  }

  async function handleLeave() {
    if (!userId || leaving || !isJoined) return;
    setLeaving(true);
    const { error } = await leaveActivity(activity.id);
    if (!error) setIsJoined(false);
    setLeaving(false);
    setLeaveConfirm(false);
  }

  function handleInstagram() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  function handlePostedShare() {
    alert("Share card coming soon");
  }

  // ── CTA — rendered in bottom bar (mobile), inline (md/lg), right panel (xl)
  const ctaButton = isHost ? (
    <Link
      href={`/activity/${activity.id}/edit`}
      className="w-full max-w-156 flex items-center justify-center rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
    >
      Manage
    </Link>
  ) : isJoined ? (
    <button
      data-leave-btn
      onClick={() => (leaveConfirm ? handleLeave() : setLeaveConfirm(true))}
      className={`w-full max-w-156 flex items-center justify-center rounded-xl text-sm font-semibold py-3.5 transition-colors border ${
        leaveConfirm
          ? "border-brand-danger text-brand-danger bg-transparent hover:bg-brand-danger/5"
          : "border-brand-teal text-brand-teal bg-transparent hover:bg-brand-teal/5"
      }`}
    >
      {leaving ? "Leaving…" : leaveConfirm ? "Leave activity?" : "Going ✓"}
    </button>
  ) : userId === null ? (
    <Link
      href="/login"
      className="w-full max-w-156 flex items-center justify-center rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
    >
      Sign in to join
    </Link>
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
      className="w-full max-w-156 flex items-center justify-center rounded-xl bg-brand-teal text-white text-sm font-semibold py-3.5 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-60"
    >
      {joining ? "Joining…" : "Join activity"}
    </button>
  );

  const shareBtn = (
    <button
      onClick={handleInstagram}
      className="cursor-pointer! w-full max-w-156 flex items-center justify-center gap-2 rounded-xl border border-brand-border text-brand-muted text-sm font-medium py-3.5 hover:border-brand-secondary hover:text-brand-secondary  hover:bg-brand-secondary/10 transition-colors"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
      Share to Instagram
    </button>
  );

  const registerBtn = activity.external_link ? (
    <a
      href={activity.external_link}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full max-w-156 flex items-center justify-center gap-2 rounded-xl border border-brand-border text-brand-muted text-sm font-medium py-3.5 hover:border-brand-secondary hover:text-brand-secondary hover:bg-brand-secondary/10 transition-colors"
    >
      <ExternalLinkIcon />
      Register here
    </a>
  ) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {showPostedBanner && (
          <div className="px-4 pt-4 xl:px-8 xl:max-w-5xl xl:mx-auto w-full">
            <div className="rounded-xl border border-brand-teal bg-brand-teal/10 px-4 py-3 text-sm font-medium text-brand-teal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>Your activity is live.</span>
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 flex-none">
                <button
                  onClick={handlePostedShare}
                  className="rounded-lg border border-brand-teal px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-teal/10 transition-colors whitespace-nowrap"
                >
                  Share to Instagram
                </button>
                <button
                  onClick={() => setShowPostedBanner(false)}
                  aria-label="Dismiss"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-brand-teal hover:bg-brand-teal/10 transition-colors"
                >
                  ×
                </button>
              </div>
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
                  <LocationButton locationName={activity.location_name} lat={activity.lat} lng={activity.lng} />
                </div>
              )}
            </div>

            <Divider />

            {/* 2. Hosted by */}
            <div>
              <SectionLabel>Hosted by</SectionLabel>
              <div className="flex items-center gap-3">
                {userId && activity.host.username ? (
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
              <p className="text-sm leading-relaxed text-brand-text">
                {activity.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <MetaPill>{skillDisplay}</MetaPill>
                <MetaPill>
                  {spotsLeftText(activity.max_participants, participantCount)}
                </MetaPill>
              </div>
            </div>

            {/* 4. Location — mobile + md/lg only; owns its top divider so xl stays clean */}
            <div className="xl:hidden flex flex-col gap-3">
              <div className="h-px bg-brand-border" />
              <SectionLabel>Location</SectionLabel>
              {activity.location_name && (
                <LocationButton locationName={activity.location_name} lat={activity.lat} lng={activity.lng} />
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
              {activity.participants.length === 0 ? (
                <p className="text-sm text-brand-muted">
                  No one yet — be the first
                </p>
              ) : (
                <>
                  {/* Mobile: horizontal scroll row */}
                  <div className="md:hidden relative">
                    <div
                      className="flex gap-6 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {activity.participants.map((p) => {
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        const avatarEl = (
                          <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-brand-avatar-bg">
                            {p.profiles?.avatar_url ? (
                              <Image
                                src={p.profiles.avatar_url}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-brand-avatar-text">
                                {initials(name)}
                              </span>
                            )}
                          </div>
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1.5 flex-none w-13"
                          >
                            {userId && p.profiles?.username ? (
                              <Link href={`/profile/${p.profiles.username}`}>
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            <span className="text-xs text-brand-text truncate w-full text-center leading-tight">
                              {firstName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-brand-bg pointer-events-none" />
                  </div>

                  {/* md+: horizontal scroll row */}
                  <div className="hidden md:block relative">
                    <div
                      className="flex gap-5 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {activity.participants.map((p) => {
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        const avatarEl = (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-brand-avatar-bg">
                            {p.profiles?.avatar_url ? (
                              <Image
                                src={p.profiles.avatar_url}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-brand-avatar-text">
                                {initials(name)}
                              </span>
                            )}
                          </div>
                        );
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1.5 flex-none w-13"
                          >
                            {userId && p.profiles?.username ? (
                              <Link href={`/profile/${p.profiles.username}`}>
                                {avatarEl}
                              </Link>
                            ) : (
                              avatarEl
                            )}
                            <span className="text-xs text-brand-text truncate w-full text-center leading-tight">
                              {firstName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-brand-bg pointer-events-none" />
                  </div>
                </>
              )}
            </div>

            {/* 6. CTAs — md/lg inline (hidden on mobile and xl) */}
            {/* <div className="hidden md:flex xl:hidden flex-col gap-3 pt-2 pb-4">
              {ctaButton}
              {shareBtn}
            </div> */}
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
              {registerBtn}
              {shareBtn}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA bar — mobile/tablet only ────────────────────────────────────── */}
      <div className="xl:hidden flex-none border-t border-brand-border bg-brand-bg p-3 flex flex-col items-center gap-2">
        {ctaButton}
        {registerBtn}
        {shareBtn}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-brand-text text-white text-xs font-medium px-4 py-2 shadow-lg">
          Coming soon
        </div>
      )}
    </div>
  );
}
