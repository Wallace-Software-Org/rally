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
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date, time };
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: ProfileActivity }) {
  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: "#C8E6DC", text: "#1A6B52" };
  const { date, time } = formatCardDate(activity.starts_at);
  const meta = [activity.location_name, activity.skill_level].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/activity/${activity.id}`}
      className="bg-brand-surface rounded-xl border border-brand-border p-4 flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold leading-4 flex-none"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <div className="flex flex-col items-end gap-0.5 flex-none">
          <span className="text-xs font-semibold text-brand-text">{date}</span>
          <span className="text-xs text-brand-muted">{time}</span>
        </div>
      </div>

      <p className="text-sm font-medium text-brand-text leading-snug">
        {activity.title}
      </p>

      <p className="text-xs text-brand-muted flex items-center gap-1.5 min-w-0">
        <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
          <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
        <span className="truncate">{meta}</span>
      </p>
    </Link>
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
  const router = useRouter();
  const isOwnProfile = currentUserId === profile.id;
  const isLoggedIn = currentUserId !== null;

  // Default to Going if it has events, else Hosting if it has events, else Going
  const defaultTab: "going" | "hosting" =
    profile.going.length > 0 || profile.hosting.length === 0 ? "going" : "hosting";
  const [tab, setTab] = useState<"going" | "hosting">(defaultTab);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="h-full flex flex-col bg-brand-bg overflow-hidden">

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="flex-none bg-brand-bg border-b border-brand-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 flex-none">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal block" />
            <span className="text-base font-semibold tracking-tight text-brand-text">Rally</span>
          </Link>
          <div className="flex-1" />
          <Link
            href="/settings"
            aria-label="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-full text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M9 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.55 11.1a1.2 1.2 0 0 0 .24 1.32l.04.04a1.45 1.45 0 1 1-2.05 2.05l-.04-.04a1.2 1.2 0 0 0-1.32-.24 1.2 1.2 0 0 0-.73 1.1v.12a1.45 1.45 0 1 1-2.9 0v-.06a1.2 1.2 0 0 0-.79-1.1 1.2 1.2 0 0 0-1.32.24l-.04.04a1.45 1.45 0 1 1-2.05-2.05l.04-.04a1.2 1.2 0 0 0 .24-1.32 1.2 1.2 0 0 0-1.1-.73H2.7a1.45 1.45 0 1 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.79 1.2 1.2 0 0 0-.24-1.32l-.04-.04A1.45 1.45 0 1 1 5.63 3.1l.04.04a1.2 1.2 0 0 0 1.32.24h.06A1.2 1.2 0 0 0 7.78 2.27V2.2a1.45 1.45 0 1 1 2.9 0v.06a1.2 1.2 0 0 0 .73 1.1 1.2 1.2 0 0 0 1.32-.24l.04-.04a1.45 1.45 0 1 1 2.05 2.05l-.04.04a1.2 1.2 0 0 0-.24 1.32v.06a1.2 1.2 0 0 0 1.1.73h.12a1.45 1.45 0 1 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.73Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">

          {/* ── Hero (brand-surface) ──────────────────────────────────────── */}
          <div className="bg-brand-surface px-6 pt-6 pb-7 flex flex-col gap-5">

            {/* Avatar + identity stacked, centered */}
            <div className="flex flex-col items-center gap-4">
              {/* Avatar with optional camera overlay on own profile */}
              <div className="relative w-20">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-brand-avatar-text">
                      {initials(profile.full_name)}
                    </span>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-border border-2 border-brand-surface flex items-center justify-center">
                    <svg width="11" height="10" viewBox="0 0 11 10" fill="none" aria-hidden="true">
                      <path
                        d="M4 1.5h3L8 3h2a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H1a.5.5 0 0 1-.5-.5v-5A.5.5 0 0 1 1 3h2L4 1.5Z"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-brand-avatar-text"
                      />
                      <circle cx="5.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" className="text-brand-avatar-text" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Name, username, instagram, bio */}
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-lg font-bold text-brand-text leading-tight">{profile.full_name}</p>
                <p className="text-sm text-brand-muted">@{profile.username}</p>
                {profile.instagram_handle && (
                  <p className="text-xs text-brand-teal-text flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                    @{profile.instagram_handle}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm text-brand-text leading-relaxed mt-3">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats (brand-surface-deep) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-surface-deep rounded-xl px-4 py-3 flex flex-col gap-0.5">
                <span className="text-xl font-bold text-brand-text leading-none">{profile.attended_count}</span>
                <span className="text-xs text-brand-muted">Activities Attended</span>
              </div>
              <div className="bg-brand-surface-deep rounded-xl px-4 py-3 flex flex-col gap-0.5">
                <span className="text-xl font-bold text-brand-text leading-none">{profile.hosted_count}</span>
                <span className="text-xs text-brand-muted">Activities Hosted</span>
              </div>
            </div>

            {/* Sport tags */}
            {profile.sports.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.sports.map((sport) => {
                  const colors = SPORT_COLORS[sport.toLowerCase()] ?? { bg: "#C8E6DC", text: "#1A6B52" };
                  return (
                    <span
                      key={sport}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {getSportLabel(sport)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Tab bar (brand-bg) ────────────────────────────────────────── */}
          <div className="sticky top-0 bg-brand-bg z-10 flex border-b border-brand-border">
            {(["going", "hosting"] as const).map((t) => {
              const count = profile[t].length;
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    isActive
                      ? "border-brand-teal text-brand-teal"
                      : count === 0
                        ? "border-transparent text-brand-border"
                        : "border-transparent text-brand-muted hover:text-brand-text"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
                  <span className={isActive ? "" : count === 0 ? "text-brand-border" : "text-brand-muted"}>
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
                    <Link href="/activity/new" className="text-brand-teal hover:underline">
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
            <div className="px-4 py-4 flex flex-col items-center gap-2">
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
    </div>
  );
}
