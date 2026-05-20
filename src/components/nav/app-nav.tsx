"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

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
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload so all client state and cached server components are cleared
    window.location.href = "/login";
  }

  const logo = (
    <div className="flex items-center gap-2 flex-none">
      <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] block" />
      <span className="text-base font-semibold tracking-tight text-[#2C2C2C]">
        Rally
      </span>
    </div>
  );

  if (!userId) {
    return (
      <header className="flex-none border-b border-[#C8B8A8] bg-[#F0EAE2]">
        <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-3">
          {logo}
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-none">
            <Link
              href="/login"
              className="border border-[#C8B8A8] text-[#7A6A5A] rounded-full px-4 py-1.5 text-sm hover:border-[#B8A898] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="bg-[#1D9E75] text-white rounded-full px-4 py-1.5 text-sm font-medium hover:bg-[#199068] transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex-none border-b border-[#C8B8A8] bg-[#F0EAE2]">
      <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-3">
        {logo}

        <div className="flex-1" />

        <Link
          href="/activity/new"
          className="hidden lg:flex items-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2 hover:bg-[#199068] active:bg-[#147a56] transition-colors flex-none"
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

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex-none overflow-hidden bg-[#D4C4B4] flex items-center justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-[#5C4A38]">
              {profile?.full_name ? initials(profile.full_name) : "?"}
            </span>
          )}
        </div>

        {/* Logout — icon only on mobile, icon + label on desktop */}
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex-none flex items-center gap-1.5 rounded-lg border border-[#C8B8A8] bg-transparent text-sm text-[#7A6A5A] hover:border-[#B8A898] hover:text-[#2C2C2C] transition-colors px-3 py-1.5"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5.5 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2.5M10 10.5l3-3-3-3M13 7.5H5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
