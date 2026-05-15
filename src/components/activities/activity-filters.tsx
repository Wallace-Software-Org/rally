"use client";

import { SPORTS_LIST } from "@/lib/utils/sport-config";

export default function ActivityFilters({
  sport,
  onChange,
}: {
  sport: string;
  onChange: (s: string) => void;
}) {
  return (
    <>
      {SPORTS_LIST.map((s) => {
        const active = sport === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border border-[#1D9E75] text-[#1D9E75] bg-[#E1F5EE] dark:bg-[#0F6E56]/20"
                : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            {s}
          </button>
        );
      })}
    </>
  );
}
