"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";
import {
  type DistanceFilter,
  DISTANCE_FILTER_OPTIONS,
} from "@/lib/utils/distance";

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

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

// ── Shared dropdown building blocks ─────────────────────────────────────────────
// One trigger + panel + option treatment for every feed filter so their styling
// (active state, panel bg, rows, headers) lives in a single place.

// Outside-click close behavior shared by all filter dropdowns.
function useDropdown() {
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

  return { open, setOpen, ref };
}

// Trigger pill. Active = teal text + teal border, neutral background (no fill).
function FilterPill({
  label,
  open,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  open: boolean;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed border-brand-border text-brand-muted opacity-60"
          : active
            ? "cursor-pointer border-brand-teal text-brand-teal"
            : "cursor-pointer border-brand-border text-brand-muted hover:border-brand-border-hover"
      }`}
    >
      {label}
      {chevron(open)}
    </button>
  );
}

// Dropdown panel container. scroll adds a capped, brand-scrollbar scroll area.
function FilterPanel({
  scroll = false,
  minWidth = "min-w-36",
  children,
}: {
  scroll?: boolean;
  minWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute top-full mt-1.5 left-0 z-50 w-max ${minWidth} bg-brand-input border border-brand-border rounded-xl shadow-lg ${
        scroll ? "max-h-80 overflow-y-auto scrollbar-brand py-1" : "py-2"
      }`}
    >
      {children}
    </div>
  );
}

// A single selectable row, checkmark when selected.
function FilterOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer w-full flex items-center justify-between gap-6 px-3.5 py-2 text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors"
    >
      {label}
      {selected && checkIcon}
    </button>
  );
}

function FilterSectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
      {children}
    </p>
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
  const { open, setOpen, ref } = useDropdown();

  const label =
    DATE_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Any time";
  const isActive = value !== "all";

  return (
    <div ref={ref} className="relative flex-none">
      <FilterPill
        label={label}
        open={open}
        active={isActive}
        onClick={() => setOpen((p) => !p)}
      />

      {open && (
        <FilterPanel>
          {DATE_FILTER_OPTIONS.map((opt) => (
            <FilterOption
              key={opt.value}
              label={opt.label}
              selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </FilterPanel>
      )}
    </div>
  );
}

// ── DistancePickerPill ──────────────────────────────────────────────────────────
// disabled: no location available (geolocation denied AND no stored profile coords).
// Shows a small muted hint prompting the user to enable location.
export function DistancePickerPill({
  value,
  onChange,
  disabled = false,
}: {
  value: DistanceFilter;
  onChange: (f: DistanceFilter) => void;
  disabled?: boolean;
}) {
  const { open, setOpen, ref } = useDropdown();

  const label =
    DISTANCE_FILTER_OPTIONS.find((o) => o.value === value)?.label ??
    "Any distance";
  const isActive = value !== "any";

  return (
    <div className="flex items-center gap-1.5 flex-none">
      <div ref={ref} className="relative flex-none">
        <FilterPill
          label={label}
          open={open}
          active={isActive}
          disabled={disabled}
          onClick={() => !disabled && setOpen((p) => !p)}
        />

        {open && !disabled && (
          <FilterPanel>
            {DISTANCE_FILTER_OPTIONS.map((opt) => (
              <FilterOption
                key={String(opt.value)}
                label={opt.label}
                selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              />
            ))}
          </FilterPanel>
        )}
      </div>
      {disabled && (
        <span className="flex-none text-[10px] text-brand-muted">
          Enable location
        </span>
      )}
    </div>
  );
}

// ── ActivitiesPicker ────────────────────────────────────────────────────────────
// Multiselect dropdown, replaces the old sport pill row + More dropdown.
// Empty selection = show all. Feed filters with OR logic across the selection.
// Grouped into "Your activities" (the user's saved sports) and "Other activities".
export function ActivitiesPicker({
  selected,
  onChange,
  userActivities = [],
}: {
  selected: string[];
  onChange: (s: string[]) => void;
  userActivities?: string[];
}) {
  const { open, setOpen, ref } = useDropdown();

  function toggle(s: string) {
    if (selected.includes(s)) {
      onChange(selected.filter((x) => x !== s));
    } else {
      onChange([...selected, s]);
    }
  }

  const label =
    selected.length === 0 ? "Activities" : `Activities (${selected.length})`;
  const isActive = selected.length > 0;

  // Ordered by SPORT_ITEMS (list order), not the user's selection order.
  const yourActivities = userActivities.length
    ? SPORT_ITEMS.filter((s) =>
        userActivities.some((u) => u.toLowerCase() === s.toLowerCase()),
      )
    : [];
  const otherActivities = SPORT_ITEMS.filter(
    (s) => !yourActivities.includes(s),
  );

  const row = (s: string) => (
    <FilterOption
      key={s}
      label={s}
      selected={selected.includes(s)}
      onClick={() => toggle(s)}
    />
  );

  return (
    <div ref={ref} className="relative flex-none">
      <FilterPill
        label={label}
        open={open}
        active={isActive}
        onClick={() => setOpen((p) => !p)}
      />

      {open && (
        <FilterPanel scroll minWidth="min-w-44">
          {yourActivities.length > 0 && (
            <>
              <FilterSectionHeader>Your activities</FilterSectionHeader>
              {yourActivities.map(row)}
            </>
          )}
          {yourActivities.length > 0 && otherActivities.length > 0 && (
            <div className="my-1 border-t border-brand-border" />
          )}
          {otherActivities.length > 0 && (
            <>
              <FilterSectionHeader>Other activities</FilterSectionHeader>
              {otherActivities.map(row)}
            </>
          )}
        </FilterPanel>
      )}
    </div>
  );
}
