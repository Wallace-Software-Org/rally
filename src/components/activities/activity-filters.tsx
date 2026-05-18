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
                ? "border border-[#1D9E75] text-[#1D9E75] bg-[#C8E6DC]"
                : "border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898]"
            }`}
          >
            {s}
          </button>
        );
      })}
    </>
  );
}
