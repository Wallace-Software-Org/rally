"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActivityDetail, Profile } from "@/types";
import {
  joinActivity,
  leaveActivity,
  cancelActivity,
} from "@/lib/actions/activities";
import { SPORT_COLORS, getSportLabel } from "@/lib/utils/sport-config";

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
  const dim = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${dim} rounded-full flex-none overflow-hidden bg-[#D4C4B4] flex items-center justify-center`}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold text-[#5C4A38]">{initials(name)}</span>
      )}
    </div>
  );
}

function JoinedPill({
  confirming,
  onFirstTap,
  onConfirm,
  leaving,
  isHost,
}: {
  confirming: boolean;
  onFirstTap: () => void;
  onConfirm: () => void;
  leaving: boolean;
  isHost: boolean;
}) {
  if (isHost) {
    return (
      <div className="w-full bg-[#C8E6DC] text-[#1A6B52] rounded-xl py-3 text-[13px] font-medium text-center">
        ✓ You&apos;re going
      </div>
    );
  }
  return (
    <button
      data-joined-pill
      onClick={() => (confirming ? onConfirm() : onFirstTap())}
      className={`w-full rounded-xl py-3 text-[13px] font-bold text-center transition-colors ${
        confirming
          ? " text-red-600 bg-red-400/10 border border-red-400"
          : "bg-[#C8E6DC] text-[#1A6B52]"
      }`}
    >
      {leaving
        ? "Leaving…"
        : confirming
          ? "Leave activity?"
          : "You're going ✓ "}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-[#C8B8A8]" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A6A5A] mb-3">
      {children}
    </p>
  );
}

function MapPlaceholder({
  locationName,
  height,
}: {
  locationName: string;
  height: "h-36" | "h-48" | "h-50";
}) {
  return (
    <div
      className={`${height} rounded-xl bg-[#E8DFCF] relative overflow-hidden`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,120,100,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,120,100,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[80%] truncate text-center text-xs font-medium text-[#5C4A38] bg-[#F0EAE2]/90 px-2.5 py-1 rounded-full border border-[#C8B8A8]">
        {locationName}
      </div>
    </div>
  );
}

export default function ActivityDetailView({
  activity,
  userId,
  userProfile,
}: {
  activity: ActivityDetail;
  userId: string | null;
  userProfile: Profile;
}) {
  const initiallyJoined = activity.participants.some(
    (p) => p.user_id === userId,
  );
  const router = useRouter();
  const [isJoined, setIsJoined] = useState(initiallyJoined);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pillConfirm, setPillConfirm] = useState(false);

  useEffect(() => {
    if (!pillConfirm) return;
    function onOutside(e: MouseEvent) {
      if (!(e.target as Element).closest?.("[data-joined-pill]")) {
        setPillConfirm(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [pillConfirm]);

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

  const isHost = userId === activity.creator_id;
  const participantCount = activity.participants.length;
  const spotsLeft =
    activity.max_participants === null
      ? null
      : activity.max_participants - participantCount;
  const skillDisplay = activity.skill_level
    ? activity.skill_level.charAt(0).toUpperCase() +
      activity.skill_level.slice(1)
    : "All levels";
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C8E6DC",
    text: "#1A6B52",
  };

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
    setPillConfirm(false);
  }

  async function handleCancel() {
    if (!userId || cancelling) return;
    setCancelling(true);
    await cancelActivity(activity.id);
    setCancelling(false);
    setCancelConfirm(false);
  }

  function handleInstagram() {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  // ── CTA buttons — rendered in bottom bar (mobile), inline (md/lg), right panel (xl)
  const joinBtn =
    userId === null ? (
      <Link
        href="/login"
        className="flex items-center justify-center rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors"
      >
        Sign in to join
      </Link>
    ) : isJoined ? (
      <button
        data-leave-btn
        onClick={() => {
          if (leaveConfirm) {
            handleLeave();
          } else {
            setLeaveConfirm(true);
          }
        }}
        className={`flex items-center justify-center rounded-xl text-sm font-semibold py-3.5 transition-colors border ${
          leaveConfirm
            ? "border-[#CC3333] text-[#CC3333] bg-transparent hover:bg-[#CC3333]/5"
            : "border-[#C8B8A8] text-[#7A6A5A] bg-transparent hover:border-[#B8A898]"
        }`}
      >
        {leaving
          ? "Leaving…"
          : leaveConfirm
            ? "Confirm leave?"
            : "Leave activity"}
      </button>
    ) : (
      <button
        onClick={handleJoin}
        disabled={joining}
        className="flex items-center justify-center rounded-xl bg-[#1D9E75] text-white text-sm font-semibold py-3.5 hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-60"
      >
        {joining ? "Joining…" : "Join activity"}
      </button>
    );

  const shareBtn = (
    <button
      onClick={handleInstagram}
      className="flex items-center justify-center gap-2 rounded-xl border border-[#C8B8A8] text-[#7A6A5A] text-sm font-medium py-3.5 hover:border-[#B8A898] hover:text-[#2C2C2C] transition-colors"
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

  const hostActions = isHost ? (
    <div className="flex gap-3">
      <Link
        href={`/activity/${activity.id}/edit`}
        className="flex-1 flex items-center justify-center rounded-xl border border-[#C8B8A8] text-[#7A6A5A] text-sm font-medium py-3 hover:border-[#B8A898] hover:text-[#2C2C2C] transition-colors"
      >
        Edit activity
      </Link>
      <button
        onClick={() => {
          if (cancelConfirm) {
            handleCancel();
          } else {
            setCancelConfirm(true);
          }
        }}
        className={`flex-1 flex items-center justify-center rounded-xl text-sm font-medium py-3 border transition-colors ${
          cancelConfirm
            ? "border-[#CC3333] text-[#CC3333] bg-transparent hover:bg-[#CC3333]/5"
            : "border-red-200 text-red-400 bg-transparent hover:border-red-300"
        }`}
      >
        {cancelling
          ? "Cancelling…"
          : cancelConfirm
            ? "Confirm cancel?"
            : "Cancel activity"}
      </button>
    </div>
  ) : null;

  const backArrow = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F0EAE2] overflow-hidden">
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header className="flex-none border-b border-[#C8B8A8] bg-[#F0EAE2]">
        <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-3">
          {/* Mobile: ← Back on left */}
          <Link
            href="/"
            className="md:hidden flex items-center gap-1 text-sm text-[#7A6A5A] hover:text-[#2C2C2C] transition-colors"
          >
            {backArrow}
            Back
          </Link>

          {/* md+: Rally logo on left */}
          <div className="hidden md:flex items-center gap-2 flex-none">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] block" />
            <span className="text-base font-semibold tracking-tight text-[#2C2C2C]">
              Rally
            </span>
          </div>

          <div className="flex-1" />

          {/* Mobile only: Manage pill — host only */}
          {isHost && (
            <button
              onClick={() => setShowSheet(true)}
              className="md:hidden border border-[#C8B8A8] rounded-full px-3 py-1 text-[11px] text-[#7A6A5A] bg-[#F0EAE2] flex-none"
            >
              Manage ···
            </button>
          )}

          {/* md/lg only: ← Back to feed — hidden at xl where breadcrumb takes over */}
          <Link
            href="/"
            className="hidden md:flex xl:hidden items-center gap-1 text-sm text-[#7A6A5A] hover:text-[#2C2C2C] transition-colors flex-none"
          >
            {backArrow}
            Back to feed
          </Link>

          {/* Avatar */}
          {userProfile && (
            <Avatar
              url={userProfile.avatar_url}
              name={userProfile.full_name}
              size="md"
            />
          )}
        </div>
      </header>

      {/* ── Breadcrumb — xl only ────────────────────────────────────────────── */}
      <div className="hidden xl:flex flex-none items-center gap-1.5 text-[12px] text-[#7A6A5A] px-8 py-2">
        <Link
          href="/"
          className="hover:text-[#1D9E75] transition-colors flex-none"
        >
          Feed
        </Link>
        <span className="text-[#C8B8A8]">/</span>
        <span className="truncate">{activity.title}</span>
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* xl: max-width wrapper with flex row; md/lg: centered single column */}
        <div className="xl:max-w-5xl xl:mx-auto xl:px-8 xl:flex xl:items-start xl:gap-10 xl:pt-8">
          {/* ── Main content column ─────────────────────────────────────────── */}
          <div className="flex-1 max-w-2xl mx-auto px-4 md:px-6 xl:max-w-none xl:mx-0 xl:px-0 py-6 flex flex-col gap-6">
            {/* 1. Header */}
            <div className="flex flex-col gap-3">
              <span
                className="inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {getSportLabel(activity.sport)}
              </span>
              <h1 className="text-2xl font-medium text-[#2C2C2C] leading-snug">
                {activity.title}
              </h1>
              <p className="flex items-center gap-2 text-sm text-[#7A6A5A]">
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
                {formatDetailDate(activity.starts_at)}
              </p>
              {/* Location row — xl only (map stays in right panel) */}
              <p className="hidden xl:flex items-center gap-2 text-[13px] text-[#7A6A5A]">
                <svg
                  width="10"
                  height="12"
                  viewBox="0 0 8 10"
                  fill="currentColor"
                  className="flex-none"
                  aria-hidden="true"
                >
                  <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
                </svg>
                {activity.location_name}
              </p>
            </div>

            <Divider />

            {/* 2. Hosted by */}
            <div>
              <SectionLabel>Hosted by</SectionLabel>
              <div className="flex items-center gap-3">
                <Avatar
                  url={activity.host.avatar_url}
                  name={activity.host.full_name}
                  size="md"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2C2C2C] leading-none">
                    {activity.host.full_name}
                  </p>
                  {activity.host.instagram_handle && (
                    <p className="text-xs text-[#7A6A5A]">
                      @{activity.host.instagram_handle}
                    </p>
                  )}
                  <span className="inline-flex self-start items-center rounded-full bg-[#C8E6DC] px-2 py-0.5 text-[11px] font-medium text-[#1A6B52]">
                    {activity.hosted_count} activities hosted
                  </span>
                </div>
              </div>
            </div>

            <Divider />

            {/* 3. About + meta pills */}
            <div>
              <SectionLabel>About</SectionLabel>
              <p className="text-sm leading-relaxed text-[#2C2C2C]">
                {activity.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1.5 border border-[#C8B8A8] rounded-full px-3 py-1 text-[11px] text-[#7A6A5A] bg-[#F0EAE2]">
                  <span className="w-1.25 h-1.25 rounded-full bg-[#C8B8A8] flex-none" />
                  {skillDisplay}
                </span>
                <span className="flex items-center gap-1.5 border border-[#C8B8A8] rounded-full px-3 py-1 text-[11px] text-[#7A6A5A] bg-[#F0EAE2]">
                  <span className="w-1.25 h-1.25 rounded-full bg-[#C8B8A8] flex-none" />
                  {activity.max_participants === null
                    ? "Open enrollment"
                    : spotsLeft === 0
                      ? "Full"
                      : `${spotsLeft} spots left`}
                </span>
              </div>
            </div>

            {/* 4. Location — mobile + md/lg only; owns its top divider so xl stays clean */}
            <div className="xl:hidden flex flex-col gap-3">
              <div className="h-px bg-[#C8B8A8]" />
              <SectionLabel>Location</SectionLabel>
              <MapPlaceholder
                locationName={activity.location_name}
                height="h-36"
              />
            </div>

            <Divider />

            {/* 5. Who's going */}
            <div>
              <SectionLabel>Who&apos;s going</SectionLabel>
              {activity.participants.length === 0 ? (
                <p className="text-sm text-[#7A6A5A]">
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
                        const isParticipantHost =
                          p.user_id === activity.creator_id;
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1.5 flex-none w-13"
                          >
                            <div
                              className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center ${
                                isParticipantHost
                                  ? "bg-[#C8E6DC]"
                                  : "bg-[#D4C4B4]"
                              }`}
                            >
                              {p.profiles?.avatar_url ? (
                                <img
                                  src={p.profiles.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className={`text-xs font-semibold ${
                                    isParticipantHost
                                      ? "text-[#1A6B52]"
                                      : "text-[#5C4A38]"
                                  }`}
                                >
                                  {initials(name)}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#2C2C2C] truncate w-full text-center leading-tight">
                              {firstName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-[#F0EAE2] pointer-events-none" />
                  </div>

                  {/* md+: horizontal scroll row */}
                  <div className="hidden md:block relative">
                    <div
                      className="flex gap-5 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {activity.participants.map((p) => {
                        const isParticipantHost =
                          p.user_id === activity.creator_id;
                        const name = p.profiles?.full_name ?? "?";
                        const firstName = name.split(" ")[0] ?? name;
                        return (
                          <div
                            key={p.id}
                            className="flex flex-col items-center gap-1.5 flex-none w-13"
                          >
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                                isParticipantHost
                                  ? "bg-[#C8E6DC]"
                                  : "bg-[#D4C4B4]"
                              }`}
                            >
                              {p.profiles?.avatar_url ? (
                                <img
                                  src={p.profiles.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className={`text-xs font-semibold ${
                                    isParticipantHost
                                      ? "text-[#1A6B52]"
                                      : "text-[#5C4A38]"
                                  }`}
                                >
                                  {initials(name)}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#2C2C2C] truncate w-full text-center leading-tight">
                              {firstName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-r from-transparent to-[#F0EAE2] pointer-events-none" />
                  </div>
                </>
              )}
            </div>

            {/* 6. CTAs — md/lg inline (hidden on mobile and xl) */}
            <div className="hidden md:flex xl:hidden flex-col gap-3 pt-2 pb-4">
              {isJoined ? (
                <JoinedPill
                  confirming={pillConfirm}
                  onFirstTap={() => setPillConfirm(true)}
                  onConfirm={handleLeave}
                  leaving={leaving}
                  isHost={isHost}
                />
              ) : (
                joinBtn
              )}
              {shareBtn}
            </div>
          </div>

          {/* ── Right sticky panel — xl only ────────────────────────────────── */}
          <div className="hidden xl:flex flex-col gap-4 w-72 flex-none sticky top-8 py-6">
            <MapPlaceholder
              locationName={activity.location_name}
              height="h-50"
            />
            <div className="flex flex-col gap-3">
              {isJoined ? (
                <JoinedPill
                  confirming={pillConfirm}
                  onFirstTap={() => setPillConfirm(true)}
                  onConfirm={handleLeave}
                  leaving={leaving}
                  isHost={isHost}
                />
              ) : (
                joinBtn
              )}
              {shareBtn}
              {hostActions && <div>{hostActions}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA bar — mobile only ────────────────────────────────────── */}
      <div className="md:hidden flex-none border-t border-[#C8B8A8] bg-[#F0EAE2] p-3 flex flex-col gap-2">
        {isJoined ? (
          <JoinedPill
            confirming={pillConfirm}
            onFirstTap={() => setPillConfirm(true)}
            onConfirm={handleLeave}
            leaving={leaving}
            isHost={isHost}
          />
        ) : (
          joinBtn
        )}
        {shareBtn}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#2C2C2C] text-white text-xs font-medium px-4 py-2 shadow-lg">
          Coming soon
        </div>
      )}

      {/* ── Manage action sheet — mobile, host only ──────────────────────────── */}
      {showSheet && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-10"
            onClick={() => setShowSheet(false)}
          />
          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 z-20">
            <div className="w-9 h-1 bg-[#C8B8A8] rounded-full mx-auto mb-3" />
            <p className="text-[12px] text-[#7A6A5A] text-center mb-2">
              Manage activity
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/activity/${activity.id}/edit`}
                className="w-full flex items-center justify-center bg-white border border-[#C8B8A8] rounded-xl p-3.5 text-[13px] text-[#2C2C2C]"
              >
                Edit activity
              </Link>
              <button
                onClick={() => {
                  setShowSheet(false);
                  setShowConfirm(true);
                }}
                className="w-full flex items-center justify-center bg-transparent border border-red-200 rounded-xl p-3.5 text-[13px] text-red-400 hover:border-red-300 transition-colors"
              >
                Cancel activity
              </button>
              <button
                onClick={() => setShowSheet(false)}
                className="w-full flex items-center justify-center bg-[#F0EAE2] rounded-xl p-3.5 text-[13px] text-[#7A6A5A] mt-1"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Cancel confirmation modal — mobile, host only ────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-30 flex items-center justify-center px-5">
          <div className="bg-white rounded-2xl p-5 w-full flex flex-col gap-3">
            <p className="text-[15px] font-semibold text-[#2C2C2C]">
              Cancel this activity?
            </p>
            <p className="text-[12px] text-[#7A6A5A] leading-relaxed">
              All participants will be removed and this activity will be
              permanently cancelled. This can&apos;t be undone.
            </p>
            <button
              onClick={async () => {
                setCancelling(true);
                const { error } = await cancelActivity(activity.id);
                setCancelling(false);
                if (!error) {
                  setShowConfirm(false);
                  router.push("/");
                }
              }}
              disabled={cancelling}
              className="w-full flex items-center justify-center bg-[#C0392B] text-white rounded-xl p-3.5 text-[13px] font-semibold disabled:opacity-60"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel activity"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full flex items-center justify-center border border-[#C8B8A8] text-[#7A6A5A] rounded-xl p-3.5 text-[13px]"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
