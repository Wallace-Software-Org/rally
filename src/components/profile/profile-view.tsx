"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ProfilePage } from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import AvatarCircle from "@/components/ui/avatar";
import {
  InstagramIcon,
  EditIcon,
  LinkIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { getSiteUrl } from "@/lib/utils/site-url";
import { COPY_FEEDBACK_MS } from "@/lib/brand";
import { upcomingOpenCount } from "@/lib/utils/hosting";
import HostingManager from "@/components/profile/hosting-manager";
import AttendingManager from "@/components/profile/attending-manager";

// ── Shared sub-components ─────────────────────────────────────────────────────

// Profile header action row: Instagram (when set, all viewers) and Edit profile
// (owner only). Side by side on mobile, stacked full width at xl. Renders
// nothing when neither applies.
function ActionRow({
  profile,
  isOwner,
}: {
  profile: ProfilePage;
  isOwner: boolean;
}) {
  const hasInstagram = !!profile.instagram_handle;
  if (!hasInstagram && !isOwner) return null;

  // A visitor's row holds Instagram alone. Left at its own width rather than
  // stretched across the card: full width would make it the loudest thing on
  // the profile for the viewer least likely to want it. The padding lands it at
  // roughly the width it has when it splits the row with Edit profile. At xl
  // both buttons stack full width as before.
  const instagramWidth = isOwner ? "flex-1" : "flex-none px-6 xl:px-0";

  return (
    <div className="w-full flex gap-2 xl:flex-col">
      {hasInstagram && (
        <a
          href={`https://instagram.com/${profile.instagram_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${instagramWidth} xl:w-full flex items-center justify-center gap-1.5 rounded-[10px] border border-brand-teal bg-transparent text-brand-teal text-sm font-semibold py-3 hover:bg-brand-teal/15 transition-colors duration-200`}
        >
          <InstagramIcon size={14} />
          Instagram
        </a>
      )}
      {isOwner && (
        <Link
          href="/profile/edit"
          className="btn-tier-2 text-sm flex-1 xl:w-full flex items-center justify-center gap-1.5"
        >
          <EditIcon size={14} />
          Edit profile
        </Link>
      )}
    </div>
  );
}

// Copies rallytime.xyz/feed/[username], so it sits with the username rather than
// in the action row. Shown to visitors too: sharing someone's feed is fair game,
// and it drops an owner-versus-visitor branch. Same copy-feedback pattern as
// everywhere else, on the shared COPY_FEEDBACK_MS timing.
function ShareFeedButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard
      .writeText(`${getSiteUrl()}/feed/${username}`)
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Feed link copied" : "Copy feed link"}
      className={`flex-none flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-200 ${
        copied ? "text-brand-teal" : "text-brand-muted hover:text-brand-text"
      }`}
    >
      {copied ? <CheckIcon size={13} /> : <LinkIcon size={13} />}
    </button>
  );
}

// The identity card: avatar, name, username, bio, tags, actions.
//
// Mobile runs left-justified and compact, because this card plus the stats,
// tags and tabs otherwise fills the first screen before a single activity. At
// xl the card is a roomy sidebar, so it keeps the centered treatment. This is
// the documented exception to the xl-only rule: alignment and stacking inside
// one component, one tree, no forked layout.
function IdentityCard({
  profile,
  isOwner,
}: {
  profile: ProfilePage;
  isOwner: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 xl:items-center">
      {/* Avatar beside the name on mobile, above it at xl */}
      <div className="w-full flex items-center gap-3.5 xl:flex-col xl:gap-4">
        <AvatarCircle
          src={profile.avatar_url}
          name={profile.full_name}
          dimension={96}
          className="w-15 h-15 xl:w-22.5 xl:h-22.5 border-3 border-brand-border flex-none"
          initialsClassName="text-lg xl:text-2xl"
        />
        <div className="min-w-0 flex-1 flex flex-col gap-0.5 xl:flex-none xl:items-center xl:text-center">
          <p className="text-lg font-bold text-brand-text leading-tight">
            {profile.full_name}
          </p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-brand-muted truncate">
              @{profile.username}
            </p>
            <ShareFeedButton username={profile.username} />
          </div>
          {/* Two beige tiles inside a beige card never read as separate
              surfaces, so mobile states the counts in a line. xl keeps the
              stats card in the sidebar below. */}
          <p className="xl:hidden text-sm text-brand-muted">
            {profile.attended_count} attended · {profile.hosted_count} hosted
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-brand-text leading-relaxed xl:text-center">
          {profile.bio}
        </p>
      )}

      {/* Tags read above the actions on mobile and below them at xl, which is
          where the sidebar has always carried them. Order only, same markup. */}
      {profile.sports.length > 0 && (
        <div className="w-full xl:order-1">
          <div className="xl:hidden">
            <SportTagsScroller sports={profile.sports} />
          </div>
          <div className="hidden xl:flex flex-wrap gap-2 justify-center">
            {profile.sports.map((sport) => (
              <ActivityPill key={sport} sport={sport} />
            ))}
          </div>
        </div>
      )}

      <ActionRow profile={profile} isOwner={isOwner} />
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
            className={`flex-1 py-3 text-sm border-b-2 -mb-px transition-colors duration-200 ${
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
    <div className="w-full rounded-xl p-4 flex flex-col gap-3 bg-brand-surface border-[0.5px] border-brand-border">
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
        className="btn-tier-1 flex items-center justify-center"
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
      <div className="flex gap-2 w-fit">
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

  // Attending is owner-only: a visitor has no business seeing which activities
  // someone has joined, with times and places. That leaves visitors one tab, so
  // the bar drops out and Hosting is simply the body of the profile. Hosting is
  // the default for the owner too, so there is nothing else to land on.
  const [tab, setTab] = useState<"going" | "hosting">("hosting");
  const activeTab = isOwner ? tab : "hosting";

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {/* ── MOBILE LAYOUT (< lg) ────────────────────────────────────── */}
      <div className="xl:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-140 mx-auto">
            {/* Hero — the identity card carries the stats and tags inline */}
            <div className="px-6 pt-6 pb-7 flex flex-col gap-5">
              <IdentityCard profile={profile} isOwner={isOwner} />

              {showNudge && <NudgeCard />}
            </div>

            {/* Tab bar — owner only; a visitor sees Hosting as the whole body */}
            {isOwner && (
              <div className="sticky top-0 bg-brand-bg z-10 flex border-b border-brand-border">
                <TabBar tab={tab} profile={profile} onTabChange={setTab} />
              </div>
            )}

            {/* Activity cards */}
            <div className="bg-brand-bg px-4 py-4">
              {activeTab === "hosting" ? (
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
            <div className="w-full bg-brand-surface border border-brand-border rounded-xl p-5">
              <IdentityCard profile={profile} isOwner={isOwner} />
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
            {/* Tab bar — owner only; a visitor sees Hosting as the whole body */}
            {isOwner && (
              <div className="flex-none flex border-b border-brand-border bg-brand-bg">
                <TabBar tab={tab} profile={profile} onTabChange={setTab} />
              </div>
            )}

            {/* Activity cards */}
            <div className="flex-1 overflow-y-auto scrollbar-brand px-6 py-4">
              {activeTab === "hosting" ? (
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
