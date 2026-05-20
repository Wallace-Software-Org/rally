"use client";

import { useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";

// ── DatePickerPill ────────────────────────────────────────────────────────────
// Exported so activity-feed.tsx can place it outside the overflow-hidden scroll
// container on mobile (prevents the popover from being clipped).
export function DatePickerPill({
  value,
  onChange,
}: {
  value: DateFilter;
  onChange: (f: DateFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const label =
    DATE_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Any time";
  const isActive = value !== "all";

  return (
    <div ref={ref} className="relative flex-none">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "border border-[#1D9E75] text-[#1D9E75] bg-[#C8E6DC]"
            : "border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898]"
        }`}
      >
        {label}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 0.15s",
          }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-20 w-max min-w-36 bg-[#F0EAE2] border border-[#C8B8A8] rounded-xl shadow-lg py-2">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-[#2C2C2C] hover:bg-[#E8DFCF] transition-colors"
            >
              {opt.label}
              {value === opt.value && (
                <svg
                  width="12"
                  height="10"
                  viewBox="0 0 12 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 5L4.5 8.5L11 1.5"
                    stroke="#1D9E75"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActivityFilters ───────────────────────────────────────────────────────────
export default function ActivityFilters({
  sport,
  onChange,
  wrap = false,
}: {
  sport: string;
  onChange: (s: string) => void;
  wrap?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pillsRef = useRef<HTMLDivElement>(null);

  // Measure after mount in collapsed (non-wrapping) mode to see if pills overflow.
  useEffect(() => {
    if (!wrap) return;
    const el = pillsRef.current;
    if (!el) return;
    setHasMore(el.scrollWidth > el.clientWidth + 1);
  }, [wrap]);

  const pills = SPORTS_LIST.map((s) => {
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
  });

  if (!wrap) {
    // Mobile: fragment rendered inside the scroll container in activity-feed.tsx
    return <>{pills}</>;
  }

  return (
    <div>
      <div
        ref={pillsRef}
        className={`flex gap-2 ${expanded ? "flex-wrap" : "overflow-hidden"}`}
      >
        {pills}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="mt-2 text-xs font-medium text-[#7A6A5A] hover:text-[#2C2C2C] transition-colors"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
