"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProfilePage } from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import { InstagramIcon, SettingsIcon } from "@/components/ui/icons";
import { upcomingOpenCount } from "@/lib/utils/hosting";
import HostingManager from "@/components/profile/hosting-manager";
import AttendingManager from "@/components/profile/attending-manager";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Avatar({ profile }: { profile: ProfilePage }) {
  return (
    <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center flex-none">
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt=""
          width={96}
          height={96}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-2xl font-semibold text-brand-avatar-text">
          {initials(profile.full_name)}
        </span>
      )}
    </div>
  );
}

function Identity({ profile }: { profile: ProfilePage }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center w-full">
      <p className="text-lg font-bold text-brand-text leading-tight">
        {profile.full_name}
      </p>
      <p className="text-sm text-brand-muted font-medium">
        @{profile.username}
      </p>
      {profile.instagram_handle && (
        <a
          href={`https://instagram.com/${profile.instagram_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 flex items-center gap-1.5 bg-brand-teal/10 text-brand-teal text-xs font-semibold px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
        >
          <InstagramIcon size={12} />
          {profile.instagram_handle}
        </a>
      )}

      {profile.bio && (
        <p className="text-sm text-brand-text leading-relaxed mt-3">
          {profile.bio}
        </p>
      )}
    </div>
  );
}

function TabBar({
  tab,
  profile,
  onTabChange,
}: {
  tab: "going" | "hosting";
  profile: ProfilePage;
  onTabChange: (t: "going" | "hosting") => void;
}) {
  const TAB_LABELS = { going: "Attending", hosting: "Hosting" } as const;
  return (
    <>
      {(["hosting", "going"] as const).map((t) => {
        const count =
          t === "hosting"
            ? upcomingOpenCount(profile.hosting)
            : upcomingOpenCount(profile.going);
        const isActive = tab === t;
        return (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-3 text-sm border-b-2 -mb-px transition-colors duration-300 ${
              isActive
                ? "border-brand-teal text-brand-text font-semibold"
                : "border-transparent text-brand-muted font-semibold hover:text-brand-text"
            }`}
          >
            {TAB_LABELS[t]}{" "}
            <span className={isActive ? "" : "text-brand-muted"}>
              ({count})
            </span>
          </button>
        );
      })}
    </>
  );
}

// ── Completeness nudge ────────────────────────────────────────────────────────

function NudgeCard() {
  return (
    <div
      className="w-full rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "#DFD3C0",
        border: "0.5px solid rgba(90,74,58,0.25)",
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-brand-text">
          Finish your profile
        </p>
        <p className="text-sm text-brand-muted">
          Add a photo and the activities you are into so people know who is
          showing up.
        </p>
      </div>
      <Link
        href="/profile/edit"
        className="btn-tier-1 flex items-center justify-center transition-colors"
      >
        Complete your profile
      </Link>
    </div>
  );
}

// ── Sport tags row ────────────────────────────────────────────────────────────
// Horizontal scroll row. Scrolls via touch on mobile; this adds click-and-drag
// scrolling for mouse users.

function SportTagsScroller({ sports }: { sports: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = {
      down: true,
      startX: e.pageX,
      startScrollLeft: el.scrollLeft,
    };
  }

  function onMouseMove(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!drag.current.down || !el) return;
    e.preventDefault();
    el.scrollLeft =
      drag.current.startScrollLeft - (e.pageX - drag.current.startX);
  }

  function endDrag() {
    drag.current.down = false;
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      className="overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex gap-2 w-fit mx-auto">
        {sports.map((sport) => (
          <ActivityPill key={sport} sport={sport} />
        ))}
      </div>
    </div>
  );
}

// ── ProfileView ───────────────────────────────────────────────────────────────

export default function ProfileView({
  profile,
  currentUserId,
}: {
  profile: ProfilePage;
  currentUserId: string | null;
}) {
  const isOwner = currentUserId === profile.id;
  const showNudge =
    isOwner && (!profile.avatar_url || profile.sports.length === 0);

  const [tab, setTab] = useState<"going" | "hosting">(
    isOwner ? "hosting" : "going",
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {/* ── MOBILE LAYOUT (< lg) ────────────────────────────────────── */}
      <div className="xl:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-140 mx-auto">
            {/* Hero */}
            <div className="px-6 pt-6 pb-7 flex flex-col gap-5">
              <div className="flex flex-col items-center gap-4">
                <Avatar profile={profile} />
                <Identity profile={profile} />
              </div>

              {showNudge && <NudgeCard />}

              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-brand-surface/70 border border-brand-border/80 rounded-xl p-4 flex flex-col justify-center gap-0.5 text-center">
                  <span className="text-2xl font-bold text-brand-text leading-none">
                    {profile.attended_count}
                  </span>
                  <span className="text-sm text-brand-muted">
                    Activities Attended
                  </span>
                </div>
                <div className="h-24 bg-brand-surface/70 border border-brand-border/80 rounded-xl p-4 flex flex-col justify-center gap-0.5 text-center">
                  <span className="text-2xl font-bold text-brand-text leading-none">
                    {profile.hosted_count}
                  </span>
                  <span className="text-sm text-brand-muted">
                    Activities Hosted
                  </span>
                </div>
              </div>

              {profile.sports.length > 0 && (
                <SportTagsScroller sports={profile.sports} />
              )}
            </div>

            {/* Tab bar */}
            <div className="sticky top-0 bg-brand-bg z-10 flex border-b border-brand-border">
              <TabBar tab={tab} profile={profile} onTabChange={setTab} />
            </div>

            {/* Activity cards */}
            <div className="bg-brand-bg px-4 py-4">
              {tab === "hosting" ? (
                <HostingManager
                  activities={profile.hosting}
                  isOwner={isOwner}
                  hostId={profile.id}
                />
              ) : (
                <AttendingManager
                  activities={profile.going}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (lg+) ────────────────────────────────────── */}
      <div className="hidden xl:flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 max-w-6xl xl:max-w-7xl mx-auto flex flex-cols min-h-0 pt-6 xl:pt-12 gap-6">
          {/* Sidebar */}
          <div className="flex flex-col overflow-y-auto px-5 py-6 gap-4 xl:w-96">
            {/* Identity card */}
            <div className="relative w-full bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col items-center gap-4">
              {isOwner && (
                <Link
                  href="/profile/edit"
                  aria-label="Settings"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-transparent text-brand-muted hover:text-brand-text hover:border-brand-border-hover transition-colors"
                >
                  <SettingsIcon size={16} />
                </Link>
              )}
              <Avatar profile={profile} />
              <Identity profile={profile} />
              {profile.sports.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.sports.map((sport) => (
                    <ActivityPill key={sport} sport={sport} />
                  ))}
                </div>
              )}
            </div>

            {showNudge && <NudgeCard />}

            {/* Stats card */}
            <div className="w-full bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-brand-border text-center">
                <div className="py-4 flex flex-col gap-0.5">
                  <span className="text-2xl font-bold text-brand-text leading-none">
                    {profile.attended_count}
                  </span>
                  <span className="text-sm text-brand-muted">Attended</span>
                </div>
                <div className="py-4 flex flex-col gap-0.5">
                  <span className="text-2xl font-bold text-brand-text leading-none">
                    {profile.hosted_count}
                  </span>
                  <span className="text-sm text-brand-muted">Hosted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="flex flex-col min-h-0 overflow-hidden px-6 xl:w-2xl 2xl:w-3xl">
            {/* Tab bar */}
            <div className="flex-none flex border-b border-brand-border bg-brand-bg">
              <TabBar tab={tab} profile={profile} onTabChange={setTab} />
            </div>

            {/* Activity cards */}
            <div className="flex-1 overflow-y-auto scrollbar-brand px-6 py-4">
              {tab === "hosting" ? (
                <HostingManager
                  activities={profile.hosting}
                  isOwner={isOwner}
                  hostId={profile.id}
                />
              ) : (
                <AttendingManager
                  activities={profile.going}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
