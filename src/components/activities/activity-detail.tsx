"use client";

import { useState } from "react";
import Link from "next/link";
import type { ActivityDetail, Profile } from "@/types";
import { joinActivity, leaveActivity, cancelActivity } from "@/lib/actions/activities";
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

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#E8E0D5]">
      <p className="text-xs text-[#7A6A5A]">{label}</p>
      <p className="text-sm font-semibold text-[#2C2C2C] mt-1">{value}</p>
    </div>
  );
}

function MapPlaceholder({
  locationName,
  height,
}: {
  locationName: string;
  height: "h-36" | "h-48";
}) {
  return (
    <div className={`${height} rounded-xl bg-[#E8DFCF] relative overflow-hidden`}>
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
  const [isJoined, setIsJoined] = useState(initiallyJoined);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const isHost = userId === activity.creator_id;
  const participantCount = activity.participants.length;
  const spotsLeft =
    activity.max_participants === null
      ? null
      : activity.max_participants - participantCount;
  const spotsDisplay =
    activity.max_participants === null
      ? "Open"
      : spotsLeft === 0
        ? "Full"
        : `${spotsLeft} of ${activity.max_participants}`;
  const skillDisplay = activity.skill_level
    ? activity.skill_level.charAt(0).toUpperCase() + activity.skill_level.slice(1)
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
        {leaving ? "Leaving…" : leaveConfirm ? "Confirm leave?" : "Leave activity"}
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
            ? "border-[#CC3333] text-[#CC3333] hover:bg-[#CC3333]/5"
            : "border-[#C8B8A8] text-[#CC3333] hover:border-[#CC3333]/50"
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

          {/* md+: ← Back to feed before avatar */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-1 text-sm text-[#7A6A5A] hover:text-[#2C2C2C] transition-colors flex-none"
          >
            {backArrow}
            Back to feed
          </Link>

          {/* Avatar */}
          {userProfile && (
            <Avatar url={userProfile.avatar_url} name={userProfile.full_name} size="md" />
          )}
        </div>
      </header>

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

            {/* 3. Location — mobile + md/lg only (at xl moves to right panel) */}
            <div className="xl:hidden flex flex-col gap-3">
              <SectionLabel>Location</SectionLabel>
              <MapPlaceholder locationName={activity.location_name} height="h-36" />
            </div>

            {/* 4. Skill + Spots — mobile + md/lg only */}
            <div className="xl:hidden grid grid-cols-2 gap-3">
              <MetaCard label="Skill level" value={skillDisplay} />
              <MetaCard label="Spots left" value={spotsDisplay} />
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
                <div className="flex flex-col gap-3">
                  {activity.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <Avatar
                        url={p.profiles?.avatar_url ?? null}
                        name={p.profiles?.full_name ?? "?"}
                        size="sm"
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-medium text-[#2C2C2C] leading-none">
                          {p.profiles?.full_name ?? "Unknown"}
                        </p>
                        {p.profiles?.instagram_handle && (
                          <p className="text-xs text-[#7A6A5A]">
                            @{p.profiles.instagram_handle}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. About — only if description exists */}
            {activity.description && (
              <>
                <Divider />
                <div>
                  <SectionLabel>About</SectionLabel>
                  <p className="text-sm leading-relaxed text-[#2C2C2C]">
                    {activity.description}
                  </p>
                </div>
              </>
            )}

            {/* 7. CTAs + host actions — md/lg inline (hidden on mobile and xl) */}
            <div className="hidden md:flex xl:hidden flex-col gap-3 pt-2 pb-4">
              {joinBtn}
              {shareBtn}
              {hostActions && <div className="pt-1">{hostActions}</div>}
            </div>
          </div>

          {/* ── Right sticky panel — xl only ────────────────────────────────── */}
          <div className="hidden xl:flex flex-col gap-4 w-72 flex-none sticky top-8 py-6">
            <div className="grid grid-cols-2 gap-3">
              <MetaCard label="Skill level" value={skillDisplay} />
              <MetaCard label="Spots left" value={spotsDisplay} />
            </div>
            <div className="flex flex-col gap-3">
              {joinBtn}
              {shareBtn}
            </div>
            {hostActions && <div>{hostActions}</div>}
            <MapPlaceholder locationName={activity.location_name} height="h-48" />
          </div>
        </div>
      </div>

      {/* ── Bottom CTA bar — mobile only ────────────────────────────────────── */}
      <div className="md:hidden flex-none border-t border-[#C8B8A8] bg-[#F0EAE2] p-3 flex flex-col gap-2">
        {joinBtn}
        {shareBtn}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#2C2C2C] text-white text-xs font-medium px-4 py-2 shadow-lg">
          Coming soon
        </div>
      )}
    </div>
  );
}
