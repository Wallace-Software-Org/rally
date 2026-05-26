"use client";

import { useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

// ── OverflowPill ──────────────────────────────────────────────────────────────
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
            ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
            : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
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
        <div className="absolute top-full mt-1.5 left-0 z-20 w-max min-w-36 bg-brand-bg border border-brand-border rounded-xl shadow-lg py-1">
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
            >
              {s}
              {activeSports.includes(s) && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
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
            ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
            : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
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
        <div className="absolute top-full mt-1.5 left-0 z-20 w-max min-w-36 bg-brand-bg border border-brand-border rounded-xl shadow-lg py-2">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
            >
              {opt.label}
              {value === opt.value && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true">
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
// sports: currently selected (empty = All).
// userActivities: logged-in user's saved activities, pinned first with a separator.
// toolbar=false: plain fragment for mobile scroll row.
// toolbar=true: pill strip with "+N" overflow pill for toolbar placement.
const MAX_TOOLBAR_OTHERS = 4;

export default function ActivityFilters({
  sports,
  onChange,
  toolbar = false,
  userActivities,
}: {
  sports: string[];
  onChange: (s: string[]) => void;
  toolbar?: boolean;
  userActivities?: string[];
}) {
  function toggle(s: string) {
    if (sports.includes(s)) {
      onChange(sports.filter((x) => x !== s));
    } else {
      onChange([...sports, s]);
    }
  }

  const allActive = sports.length === 0;

  // Pinned items: user's saved activities in SPORT_ITEMS order
  const pinned = userActivities?.length
    ? SPORT_ITEMS.filter((s) =>
        userActivities.some((u) => u.toLowerCase() === s.toLowerCase()),
      )
    : [];
  const others = SPORT_ITEMS.filter((s) => !pinned.includes(s));

  const visibleOthers = toolbar ? others.slice(0, MAX_TOOLBAR_OTHERS) : others;
  const hiddenOthers = toolbar ? others.slice(MAX_TOOLBAR_OTHERS) : [];

  const showSeparator = pinned.length > 0 && others.length > 0;

  function pillCls(active: boolean) {
    return `flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
        : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
    }`;
  }

  const allPill = (
    <button key="All" onClick={() => onChange([])} className={pillCls(allActive)}>
      All
    </button>
  );

  const pinnedPills = pinned.map((s) => (
    <button key={s} onClick={() => toggle(s)} className={pillCls(sports.includes(s))}>
      {s}
    </button>
  ));

  const separator = showSeparator ? (
    <div key="sep" className="w-px h-4 bg-brand-border flex-none self-center" />
  ) : null;

  const otherPills = visibleOthers.map((s) => (
    <button key={s} onClick={() => toggle(s)} className={pillCls(sports.includes(s))}>
      {s}
    </button>
  ));

  if (!toolbar) {
    return (
      <>
        {allPill}
        {pinnedPills}
        {separator}
        {otherPills}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {allPill}
      {pinnedPills}
      {separator}
      {otherPills}
      {hiddenOthers.length > 0 && (
        <OverflowPill sports={hiddenOthers} activeSports={sports} onSelect={toggle} />
      )}
    </div>
  );
}
