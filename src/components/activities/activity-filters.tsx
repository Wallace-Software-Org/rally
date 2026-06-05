"use client";

import { useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

const MAX_PINNED = 5;

const checkIcon = (
  <svg
    width="12"
    height="10"
    viewBox="0 0 12 10"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 5L4.5 8.5L11 1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const chevron = (open: boolean) => (
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
);

// ── MorePill (desktop toolbar) ────────────────────────────────────────────────
function MorePill({
  yourActivities,
  otherActivities,
  activeSports,
  onSelect,
}: {
  yourActivities: string[];
  otherActivities: string[];
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

  const allItems = [...yourActivities, ...otherActivities];
  const isActive = allItems.some((s) => activeSports.includes(s));

  return (
    <div ref={ref} className="relative flex-none">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`cursor-pointer flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
            : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
        }`}
      >
        More
        {chevron(open)}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-max min-w-44 bg-brand-bg border border-brand-border rounded-xl shadow-lg py-1">
          {yourActivities.length > 0 && (
            <>
              <p className="px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Your activities
              </p>
              {yourActivities.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
                >
                  {s}
                  {activeSports.includes(s) && checkIcon}
                </button>
              ))}
            </>
          )}
          {yourActivities.length > 0 && otherActivities.length > 0 && (
            <div className="my-1 border-t border-brand-border" />
          )}
          {otherActivities.length > 0 && (
            <>
              <p className="px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                Other activities
              </p>
              {otherActivities.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
                >
                  {s}
                  {activeSports.includes(s) && checkIcon}
                </button>
              ))}
            </>
          )}
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
        className={`cursor-pointer flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
            : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
        }`}
      >
        {label}
        {chevron(open)}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-max min-w-36 bg-brand-bg border border-brand-border rounded-xl shadow-lg py-2">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="cursor-pointer w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
            >
              {opt.label}
              {value === opt.value && checkIcon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActivityFilters ───────────────────────────────────────────────────────────
// sports: currently selected (empty = All).
// userActivities: logged-in user's saved activities — first 5 pinned as visible pills.
// toolbar=false: plain fragment for mobile scroll row.
// toolbar=true: pill strip with "More" sectioned dropdown for desktop.
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

  // Ordered by SPORT_ITEMS to match the list order, not the user's selection order
  const pinned = userActivities?.length
    ? SPORT_ITEMS.filter((s) =>
        userActivities.some((u) => u.toLowerCase() === s.toLowerCase()),
      )
    : [];

  const pinnedVisible = pinned.slice(0, MAX_PINNED);
  const pinnedOverflow = pinned.slice(MAX_PINNED);
  const others = SPORT_ITEMS.filter((s) => !pinned.includes(s));

  // Show separator only when there are pinned pills and items after them
  const showSeparator =
    pinnedVisible.length > 0 &&
    (pinnedOverflow.length > 0 || others.length > 0);

  function pillCls(active: boolean) {
    return `cursor-pointer flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border border-brand-teal text-brand-teal bg-brand-teal-muted"
        : "border border-brand-border text-brand-muted hover:border-brand-border-hover"
    }`;
  }

  const allPill = (
    <button
      key="All"
      onClick={() => onChange([])}
      className={pillCls(allActive)}
    >
      All
    </button>
  );

  const pinnedVisiblePills = pinnedVisible.map((s) => (
    <button
      key={s}
      onClick={() => toggle(s)}
      className={pillCls(sports.includes(s))}
    >
      {s}
    </button>
  ));

  const separator = showSeparator ? (
    <div key="sep" className="w-px h-4 bg-brand-border flex-none self-center" />
  ) : null;

  if (!toolbar) {
    // Mobile: pinned first, separator, then overflow + others in SPORT_ITEMS order
    const afterSeparator = [...pinnedOverflow, ...others];
    return (
      <>
        {allPill}
        {pinnedVisiblePills}
        {separator}
        {afterSeparator.map((s) => (
          <button
            key={s}
            onClick={() => toggle(s)}
            className={pillCls(sports.includes(s))}
          >
            {s}
          </button>
        ))}
      </>
    );
  }

  // Desktop toolbar: pinned pills + More dropdown (sectioned)
  const hasMore = pinnedOverflow.length > 0 || others.length > 0;

  return (
    <div className="flex items-center gap-2">
      {allPill}
      {pinnedVisiblePills}
      {separator}
      {hasMore && (
        <MorePill
          yourActivities={pinnedOverflow}
          otherActivities={others}
          activeSports={sports}
          onSelect={toggle}
        />
      )}
    </div>
  );
}
