"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ProfilePage, ProfileActivity } from "@/types";
import { SPORT_COLORS, getSportLabel } from "@/lib/utils/sport-config";
import { createClient } from "@/lib/supabase/client";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCardDate(startsAt: string): { date: string; time: string } {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: ProfileActivity }) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? {
    bg: "#C2DDD9",
    text: "#2A6B64",
  };
  const { date, time } = formatCardDate(activity.starts_at);

  return (
    <Link
      href={`/activity/${activity.id}`}
      className="bg-brand-surface rounded-xl border border-brand-border/80 p-4 flex flex-col gap-3"
    >
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium self-start flex-none bg-brand-teal/20 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/30">
        {getSportLabel(activity.sport)}
      </span>

      <p className="text-base font-semibold text-brand-text leading-snug">
        {activity.title}
      </p>

      <div className="flex flex-col gap-1.5 text-xs text-brand-muted">
        {activity.location_name && (
          <span className="flex items-center gap-1.5">
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
          </span>
        )}
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-none"
              aria-hidden="true"
            >
              <rect
                x="1.5"
                y="3"
                width="13"
                height="11.5"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M5 1.5V4M11 1.5V4M1.5 7h13"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            {date}
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-none"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M8 4.5V8.5l2.5 1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {time}
          </span>
        </span>
      </div>
    </Link>
  );
}

// ── ProfileView ───────────────────────────────────────────────────────────────

const TAB_LABELS = { going: "Attending", hosting: "Hosting" } as const;

export default function ProfileView({
  profile,
  currentUserId,
}: {
  profile: ProfilePage;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const isOwnProfile = currentUserId === profile.id;
  const isLoggedIn = currentUserId !== null;

  const defaultTab: "going" | "hosting" =
    profile.going.length > 0 || profile.hosting.length === 0
      ? "going"
      : "hosting";
  const [tab, setTab] = useState<"going" | "hosting">(defaultTab);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-brand-bg">
      <div className="max-w-120 mx-auto">
        {/* ── Hero (brand-surface) ──────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-7 flex flex-col gap-5">
          {/* Avatar + identity, centered */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-brand-avatar-text">
                  {initials(profile.full_name)}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
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
                  className="text-sm text-brand-teal flex items-center gap-1 font-medium hover:opacity-80 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  Instagram
                </a>
              )}
              {profile.bio && (
                <p className="text-sm text-brand-text leading-relaxed mt-3">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-brand-surface border border-brand-border/80 rounded-xl p-4 flex flex-col justify-center gap-0.5 text-center">
              <span className="text-2xl font-bold text-brand-text leading-none">
                {profile.attended_count}
              </span>
              <span className="text-sm text-brand-muted">
                Activities Attended
              </span>
            </div>
            <div className="h-24 bg-brand-surface border border-brand-border/80 rounded-xl p-4 flex flex-col justify-center gap-0.5 text-center">
              <span className="text-2xl font-bold text-brand-text leading-none">
                {profile.hosted_count}
              </span>
              <span className="text-sm text-brand-muted">
                Activities Hosted
              </span>
            </div>
          </div>

          {/* Sport tags — single scrollable row, teal outline style */}
          {profile.sports.length > 0 && (
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none">
              <div className="flex gap-2 w-fit mx-auto">
                {profile.sports.map((sport) => (
                  <span
                    key={sport}
                    className="flex-none rounded-full px-3 py-1 text-xs font-medium bg-brand-teal/20 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/30"
                  >
                    {getSportLabel(sport)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-brand-bg z-10 flex border-b border-brand-border">
          {(["going", "hosting"] as const).map((t) => {
            const count = profile[t].length;
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
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
        </div>

        {/* ── Activity cards or empty state ─────────────────────────────── */}
        <div className="bg-brand-bg px-4 py-4 flex flex-col gap-3">
          {profile[tab].length === 0 ? (
            <p className="py-10 text-sm text-brand-muted text-center leading-relaxed">
              {tab === "going" ? (
                <>
                  Nothing coming up.{" "}
                  <Link href="/" className="text-brand-teal hover:underline">
                    Find something on the feed.
                  </Link>
                </>
              ) : (
                <>
                  You haven&apos;t hosted anything yet.{" "}
                  <Link
                    href="/activity/new"
                    className="text-brand-teal hover:underline"
                  >
                    Post an activity.
                  </Link>
                </>
              )}
            </p>
          ) : (
            profile[tab].map((a) => <ActivityCard key={a.id} activity={a} />)
          )}
        </div>

        {/* ── Sign out ──────────────────────────────────────────────────── */}
        {isLoggedIn && (
          <div className="px-4 pt-12 pb-6 flex flex-col items-center gap-2">
            {signOutConfirm ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-brand-danger px-5 py-1.5 text-sm font-medium text-brand-danger transition-colors hover:bg-brand-danger/10"
                >
                  Sign out
                </button>
                <button
                  onClick={() => setSignOutConfirm(false)}
                  className="text-sm text-brand-muted hover:text-brand-text transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setSignOutConfirm(true)}
                className="text-sm text-brand-muted hover:text-brand-text transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
