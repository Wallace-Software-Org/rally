"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";
import { signOut } from "@/lib/actions/profiles";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AppNav({
  profile,
  userId,
}: {
  profile: Profile;
  userId: string | null;
}) {
  const router = useRouter();
  const logo = (
    <Link href="/" className="flex items-center gap-2 flex-none">
      <span className="w-2.5 h-2.5 rounded-full bg-brand-teal block" />
      <span className="text-base font-semibold tracking-tight text-brand-text">
        Rally
      </span>
    </Link>
  );

  if (!userId) {
    return (
      <header className="flex-none border-b border-brand-border bg-brand-bg">
        <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-3">
          {logo}
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-none">
            <Link
              href="/login"
              className="border border-brand-border text-brand-muted rounded-full px-4 py-1.5 text-sm hover:border-brand-border-hover transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="bg-brand-teal text-white rounded-full px-4 py-1.5 text-sm font-medium hover:bg-brand-teal-hover transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex-none border-b border-brand-border bg-brand-bg">
      <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-3">
        {logo}

        <div className="flex-1" />

        <Link
          href="/activity/new"
          className="hidden lg:flex items-center gap-2 rounded-xl bg-brand-teal text-white text-sm font-semibold px-4 py-2 hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors flex-none"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 1.5V12.5M1.5 7H12.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Post activity
        </Link>

        {/* TEMP: emergency sign-out for debugging */}
        <button
          onClick={async () => { await signOut(); router.push("/login"); }}
          className="text-xs text-brand-muted hover:text-brand-danger transition-colors flex-none"
        >
          Sign out
        </button>

        {/* Avatar — links to own profile when username is set */}
        {profile?.username ? (
          <Link
            href={`/profile/${profile.username}`}
            className="w-9 h-9 rounded-full flex-none overflow-hidden bg-brand-avatar-bg flex items-center justify-center"
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-brand-avatar-text">
                {initials(profile.full_name)}
              </span>
            )}
          </Link>
        ) : (
          <div className="w-9 h-9 rounded-full flex-none overflow-hidden bg-brand-avatar-bg flex items-center justify-center">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-brand-avatar-text">
                {profile?.full_name ? initials(profile.full_name) : "?"}
              </span>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
