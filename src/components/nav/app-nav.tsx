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
  return (
    <header className="flex-none flex items-center h-14 px-4 gap-3 border-b border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-2 flex-none">
        <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75] block" />
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
          Rally
        </span>
      </div>

      {/* Mobile: city center */}
      <span className="flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400 truncate lg:hidden">
        {profile?.city ?? "Nearby"}
      </span>

      {/* Desktop: city center + Post activity button */}
      <span className="hidden lg:block flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400 truncate">
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

      {/* Avatar — both layouts */}
      <div className="w-9 h-9 rounded-full flex-none overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            {profile?.full_name ? initials(profile.full_name) : "?"}
          </span>
        )}
      </div>
    </header>
  );
}
