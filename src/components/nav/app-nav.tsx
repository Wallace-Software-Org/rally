"use client";

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

export default function AppNav({ profile }: { profile: Profile }) {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload so all client state and cached server components are cleared
    window.location.href = "/login";
  }

  return (
    <header className="flex-none flex items-center h-14 px-4 gap-3 border-b border-[#C8B8A8] bg-[#F0EAE2]">
      <div className="flex items-center gap-2 flex-none">
        <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] block" />
        <span className="text-base font-semibold tracking-tight text-[#2C2C2C]">
          Rally
        </span>
      </div>

      {/* Mobile: city center */}
      <span className="flex-1 text-center text-sm text-[#7A6A5A] truncate lg:hidden">
        {profile?.city ?? "Nearby"}
      </span>

      {/* Desktop: city center + Post activity button */}
      <span className="hidden lg:block flex-1 text-center text-sm text-[#7A6A5A] truncate">
        {profile?.city ? `📍 ${profile.city}` : "📍 Nearby"}
      </span>
      <button className="hidden lg:flex items-center gap-2 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2 hover:bg-[#199068] active:bg-[#147a56] transition-colors flex-none">
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
      </button>

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
        className="flex-none flex items-center gap-1.5 rounded-lg border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898] hover:text-[#2C2C2C] transition-colors px-2 py-1.5"
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
        <span className="hidden lg:inline text-xs font-medium">Sign out</span>
      </button>
    </header>
  );
}
