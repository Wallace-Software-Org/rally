"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ProfilePage, ProfileActivity } from "@/types";
import ActivityPill from "@/components/ui/activity-pill";
import { CameraIcon, PencilIcon, InstagramIcon } from "@/components/ui/icons";
import { uploadAvatar } from "@/lib/actions/profiles";

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

function ActivityCard({
  activity,
  showShare,
}: {
  activity: ProfileActivity;
  showShare?: boolean;
}) {
  const { date, time } = formatCardDate(activity.starts_at);

  return (
    <div className="xl:min-h-32 flex flex-col">
      <Link
        href={`/activity/${activity.id}`}
        className="bg-brand-surface/70 rounded-xl border border-brand-border/80 p-4 flex flex-col justify-between h-full transition-all hover:border-brand-border-hover"
      >
        <div className="flex flex-col gap-2">
          <ActivityPill sport={activity.sport} />
          <p className="text-lg xl:text-base font-semibold text-brand-text leading-snug line-clamp-2">
            {activity.title}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 text-sm xl:text-xs text-brand-muted">
          {activity.location_name && (
            <span className="flex items-center gap-1">
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
              <span className="truncate text-sm xl:text-xs">
                {activity.location_name}
              </span>
            </span>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
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
            {showShare && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert("Share card coming soon");
                }}
                className="flex-none flex items-center gap-1.5 bg-brand-teal text-white text-xs font-semibold px-2.5 py-1.5 rounded-full hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors"
              >
                <InstagramIcon size={11} />
                Share
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Avatar({
  profile,
  isOwner,
  uploading,
  onCameraClick,
}: {
  profile: ProfilePage;
  isOwner: boolean;
  uploading?: boolean;
  onCameraClick?: () => void;
}) {
  return (
    <div className="relative flex-none">
      <button
        onClick={isOwner ? onCameraClick : undefined}
        disabled={uploading}
        aria-label={isOwner ? "Change photo" : undefined}
        className={`w-24 h-24 rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center${isOwner ? " cursor-pointer" : ""}`}
      >
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
      </button>

      {isOwner && (
        <button
          onClick={onCameraClick}
          disabled={uploading}
          aria-label="Change photo"
          className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-brand-teal flex items-center justify-center border-2 border-brand-bg hover:bg-brand-teal-hover transition-colors"
        >
          <CameraIcon />
        </button>
      )}
    </div>
  );
}

function Identity({
  profile,
  isOwner,
}: {
  profile: ProfilePage;
  isOwner: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center w-full">
      <div className="relative inline-flex items-center">
        <p className="text-lg font-bold text-brand-text leading-tight">
          {profile.full_name}
        </p>
        {isOwner && (
          <Link
            href="/profile/edit"
            aria-label="Edit profile"
            className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
          >
            <PencilIcon />
          </Link>
        )}
      </div>
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
      {(["going", "hosting"] as const).map((t) => {
        const count = profile[t].length;
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

function ActivityList({
  tab,
  profile,
  showShare,
  gridCols2,
}: {
  tab: "going" | "hosting";
  profile: ProfilePage;
  showShare?: boolean;
  gridCols2?: boolean;
}) {
  if (profile[tab].length === 0) {
    return (
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
    );
  }
  return (
    <div
      className={gridCols2 ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}
    >
      {profile[tab].map((a) => (
        <ActivityCard key={a.id} activity={a} showShare={showShare} />
      ))}
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
  const router = useRouter();
  const isOwner = currentUserId === profile.id;

  const [tab, setTab] = useState<"going" | "hosting">(
    isOwner ? "hosting" : "going",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Photo must be under 2MB");
      e.target.value = "";
      return;
    }
    setUploadError(null);
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) {
      setUploadError(error);
    } else {
      router.refresh();
    }
    e.target.value = "";
  }

  function handleCameraClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {isOwner && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* ── MOBILE LAYOUT (< lg) ────────────────────────────────────── */}
      <div className="xl:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-120 mx-auto">
            {/* Hero */}
            <div className="px-6 pt-6 pb-7 flex flex-col gap-5">
              <div className="flex flex-col items-center gap-4">
                <Avatar
                  profile={profile}
                  isOwner={isOwner}
                  uploading={uploading}
                  onCameraClick={handleCameraClick}
                />
                {uploadError && (
                  <p className="text-xs text-brand-danger -mt-2">
                    {uploadError}
                  </p>
                )}
                <Identity profile={profile} isOwner={isOwner} />
              </div>

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
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden scrollbar-none">
                  <div className="flex gap-2 w-fit mx-auto">
                    {profile.sports.map((sport) => (
                      <ActivityPill key={sport} sport={sport} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div className="sticky top-0 bg-brand-bg z-10 flex border-b border-brand-border">
              <TabBar tab={tab} profile={profile} onTabChange={setTab} />
            </div>

            {/* Activity cards */}
            <div className="bg-brand-bg px-4 py-4">
              <ActivityList
                tab={tab}
                profile={profile}
                showShare={isOwner && tab === "hosting"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (lg+) ────────────────────────────────────── */}
      <div className="hidden xl:flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 max-w-6xl xl:max-w-7xl mx-auto flex flex-cols min-h-0 pt-6 xl:pt-12 gap-6">
          {/* Sidebar */}
          <div className="flex flex-col overflow-y-auto px-5 py-6 gap-4">
            {/* Identity card */}
            <div className="bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col items-center gap-4 max-w-sm xl:max-w-auto xl:w-md">
              <Avatar
                profile={profile}
                isOwner={isOwner}
                uploading={uploading}
                onCameraClick={handleCameraClick}
              />
              {uploadError && (
                <p className="text-xs text-brand-danger -mt-2">{uploadError}</p>
              )}
              <Identity profile={profile} isOwner={isOwner} />
              {profile.sports.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.sports.map((sport) => (
                    <ActivityPill key={sport} sport={sport} />
                  ))}
                </div>
              )}
            </div>

            {/* Stats card */}
            <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
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
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ActivityList
                tab={tab}
                profile={profile}
                showShare={isOwner && tab === "hosting"}
                gridCols2
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
