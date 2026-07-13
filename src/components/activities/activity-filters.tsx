"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { SPORTS_LIST } from "@/lib/utils/sport-config";
import { type DateFilter, DATE_FILTER_OPTIONS } from "@/lib/utils/date-filters";
import {
  type DistanceFilter,
  DISTANCE_FILTER_OPTIONS,
} from "@/lib/utils/distance";
import type { GeoStatus } from "@/hooks/use-location";
import { MapIcon, CalendarIcon } from "@/components/ui/icons";

const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

export type FeedView = "map" | "calendar";

// Icon-only segmented control for the right end of the filter pill row: map
// (default) and calendar. The active segment is a solid teal circle.
export function ViewToggle({
  value,
  onChange,
}: {
  value: FeedView;
  onChange: (view: FeedView) => void;
}) {
  return (
    <div className="flex-none flex items-center gap-0.5 rounded-full border border-brand-border p-0.5">
      <ViewToggleButton
        label="Map view"
        active={value === "map"}
        onClick={() => onChange("map")}
      >
        <MapIcon size={15} />
      </ViewToggleButton>
      <ViewToggleButton
        label="Calendar view"
        active={value === "calendar"}
        onClick={() => onChange("calendar")}
      >
        <CalendarIcon size={15} />
      </ViewToggleButton>
    </div>
  );
}

function ViewToggleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-200 ${
        active
          ? "bg-brand-teal text-white"
          : "text-brand-muted hover:text-brand-text"
      }`}
    >
      {children}
    </button>
  );
}

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

// Outside-click close behavior shared by all filter dropdowns. Panels are fixed
// positioned (see FilterPanel), so they don't follow scroll; close on any scroll
// outside the panel and on resize to avoid a detached, drifting menu.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onScroll(e: Event) {
      // Ignore scrolling inside the panel itself (e.g. the activities list).
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
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
      className={`flex items-center gap-1 rounded-full border px-4 py-2 text-sm xl:px-3.5 xl:py-1.5 xl:text-xs font-medium transition-colors duration-200 ${
        disabled
          ? "cursor-not-allowed border-brand-border text-brand-muted opacity-60"
          : active
            ? "cursor-pointer border-brand-teal text-brand-teal pill-hover-tint-teal"
            : "cursor-pointer border-brand-border text-brand-muted hover:border-brand-border-hover pill-hover-tint"
      }`}
    >
      {label}
      {chevron(open)}
    </button>
  );
}

// Dropdown panel container. scroll adds a capped, brand-scrollbar scroll area.
// Fixed positioned (anchored under its trigger) so it escapes the mobile filter
// bar's horizontal-scroll overflow clip. Anchors inward when the trigger sits
// past the viewport midpoint so it never runs off the right edge.
function FilterPanel({
  scroll = false,
  minWidth = "min-w-36",
  children,
}: {
  scroll?: boolean;
  minWidth?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left?: number;
    right?: number;
  } | null>(null);

  useLayoutEffect(() => {
    const trigger = ref.current?.previousElementSibling as HTMLElement | null;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const top = r.bottom + 6;
    if (r.left > window.innerWidth / 2) {
      setPos({ top, right: Math.round(window.innerWidth - r.right) });
    } else {
      setPos({ top, left: Math.round(r.left) });
    }
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos?.top,
        left: pos?.left,
        right: pos?.right,
        visibility: pos ? "visible" : "hidden",
      }}
      className={`z-50 w-max ${minWidth} max-w-[calc(100vw-2rem)] bg-brand-input border border-brand-border rounded-xl shadow-lg ${
        scroll
          ? "max-h-80 overflow-y-auto scrollbar-brand py-2 xl:py-1"
          : "py-2"
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
      className="cursor-pointer w-full flex items-center justify-between gap-6 px-4 py-3 text-base xl:px-3.5 xl:py-2 xl:text-xs font-medium text-brand-text hover:bg-brand-map-bg transition-colors duration-200"
    >
      {label}
      {selected && checkIcon}
    </button>
  );
}

function FilterSectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 xl:px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
      {children}
    </p>
  );
}

// ── ShowPicker ──────────────────────────────────────────────────────────────────
// Single-select scope filter for logged-in users: All, Hosting, or Attending.
export type ShowFilter = "all" | "hosting" | "attending";

const SHOW_FILTER_OPTIONS: { label: string; value: ShowFilter }[] = [
  { label: "All", value: "all" },
  { label: "Hosting", value: "hosting" },
  { label: "Attending", value: "attending" },
];

export function ShowPicker({
  value,
  onChange,
}: {
  value: ShowFilter;
  onChange: (f: ShowFilter) => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  const label =
    SHOW_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "All";
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
          {SHOW_FILTER_OPTIONS.map((opt) => (
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
// With coords it filters by radius. Without coords it stays a normal (inactive)
// pill labeled "Distance"; its panel prompts the user to enable location.
// Geolocation is requested only on the in-panel button, never on load or tap.
export function DistancePickerPill({
  value,
  onChange,
  hasCoords,
  status,
  isLoggedIn,
  onRequestLocation,
}: {
  value: DistanceFilter;
  onChange: (f: DistanceFilter) => void;
  hasCoords: boolean;
  status: GeoStatus;
  isLoggedIn: boolean;
  onRequestLocation: () => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  const label = hasCoords
    ? (DISTANCE_FILTER_OPTIONS.find((o) => o.value === value)?.label ??
      "Any distance")
    : "Distance";
  const isActive = hasCoords && value !== "any";

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
          {hasCoords ? (
            DISTANCE_FILTER_OPTIONS.map((opt) => (
              <FilterOption
                key={String(opt.value)}
                label={opt.label}
                selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              />
            ))
          ) : (
            <DistanceLocationPrompt
              status={status}
              isLoggedIn={isLoggedIn}
              onRequestLocation={onRequestLocation}
            />
          )}
        </FilterPanel>
      )}
    </div>
  );
}

// Panel content shown when no coords are available yet.
function DistanceLocationPrompt({
  status,
  isLoggedIn,
  onRequestLocation,
}: {
  status: GeoStatus;
  isLoggedIn: boolean;
  onRequestLocation: () => void;
}) {
  const blocked = status === "denied" || status === "unsupported";

  return (
    <div className="w-72 p-4 text-base xl:px-3.5 xl:py-2.5 xl:text-xs">
      {blocked ? (
        isLoggedIn ? (
          <p className="text-brand-muted leading-relaxed">
            Location is blocked. Add a city to your{" "}
            <Link href="/profile/edit" className="text-brand-teal underline">
              profile
            </Link>{" "}
            to filter by distance.
          </p>
        ) : (
          <p className="text-brand-muted leading-relaxed">
            Location is blocked. You can allow it in your browser settings.
          </p>
        )
      ) : (
        <>
          <p className="mb-2.5 text-center text-sm xl:text-xs text-brand-muted leading-relaxed">
            Distance filtering needs your location.
          </p>
          <button
            onClick={onRequestLocation}
            className="btn-tier-1 w-full text-base py-3 xl:text-xs"
          >
            Enable location
          </button>
        </>
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
          {yourActivities.length > 0 ? (
            // Logged-in with saved sports: two grouped sections.
            <>
              <FilterSectionHeader>Your activities</FilterSectionHeader>
              {yourActivities.map(row)}
              {otherActivities.length > 0 && (
                <div className="my-1 border-t border-brand-border" />
              )}
              {otherActivities.length > 0 && (
                <>
                  <FilterSectionHeader>Other activities</FilterSectionHeader>
                  {otherActivities.map(row)}
                </>
              )}
            </>
          ) : (
            // Signed out or no saved sports: flat list, no section headers.
            SPORT_ITEMS.map(row)
          )}
        </FilterPanel>
      )}
    </div>
  );
}
