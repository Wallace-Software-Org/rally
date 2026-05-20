"use client";

import { useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";

// Sport items without the "All" sentinel
const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

// ── OverflowPill ──────────────────────────────────────────────────────────────
// "+N ▾" pill that reveals hidden sports in a popover.
function OverflowPill({
  sports,
  activeSports,
  onSelect,
}: {
  sports: string[];
  activeSports: string[];
  onSelect: (s: string) => void;
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

  const isActive = sports.some((s) => activeSports.includes(s));

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
        +{sports.length}
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
        <div className="absolute top-full mt-1.5 left-0 z-20 w-max min-w-36 bg-[#F0EAE2] border border-[#C8B8A8] rounded-xl shadow-lg py-1">
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-[#2C2C2C] hover:bg-[#E8DFCF] transition-colors"
            >
              {s}
              {activeSports.includes(s) && (
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

// ── DatePickerPill ────────────────────────────────────────────────────────────
// Exported so activity-feed.tsx can place it in the correct position per breakpoint.
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
// Sports is a multi-select array; empty means "All". "All" pill clears the selection.
// toolbar=false (default): plain fragment for mobile scroll row.
// toolbar=true: pill strip with "+N ▾" overflow pill for toolbar placement.
const MAX_TOOLBAR_VISIBLE = 4; // shown sport pills; "All" is always rendered separately

export default function ActivityFilters({
  sports,
  onChange,
  toolbar = false,
}: {
  sports: string[];
  onChange: (s: string[]) => void;
  toolbar?: boolean;
}) {
  function toggle(s: string) {
    if (sports.includes(s)) {
      onChange(sports.filter((x) => x !== s));
    } else {
      onChange([...sports, s]);
    }
  }

  const allActive = sports.length === 0;

  const allPill = (
    <button
      key="All"
      onClick={() => onChange([])}
      className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        allActive
          ? "border border-[#1D9E75] text-[#1D9E75] bg-[#C8E6DC]"
          : "border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898]"
      }`}
    >
      All
    </button>
  );

  const visibleItems = toolbar
    ? SPORT_ITEMS.slice(0, MAX_TOOLBAR_VISIBLE)
    : SPORT_ITEMS;
  const hiddenItems = toolbar ? SPORT_ITEMS.slice(MAX_TOOLBAR_VISIBLE) : [];

  const sportPills = visibleItems.map((s) => (
    <button
      key={s}
      onClick={() => toggle(s)}
      className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        sports.includes(s)
          ? "border border-[#1D9E75] text-[#1D9E75] bg-[#C8E6DC]"
          : "border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898]"
      }`}
    >
      {s}
    </button>
  ));

  if (!toolbar) {
    return (
      <>
        {allPill}
        {sportPills}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {allPill}
      {sportPills}
      {hiddenItems.length > 0 && (
        <OverflowPill
          sports={hiddenItems}
          activeSports={sports}
          onSelect={toggle}
        />
      )}
    </div>
  );
}
