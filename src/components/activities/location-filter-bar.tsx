"use client";

// Shown at the top of the feed panel after a grouped map pin is tapped: the
// panel is filtered to one place, and this names it and is the way back out.
// Same bar on mobile and desktop; only the panel it sits in is wider.
export default function LocationFilterBar({
  name,
  count,
  onClear,
}: {
  name: string;
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5">
      <p className="flex-1 min-w-0 truncate text-sm font-medium text-brand-text">
        {name}
        <span className="text-brand-muted">
          {" · "}
          {count} {count === 1 ? "activity" : "activities"}
        </span>
      </p>
      <button
        type="button"
        onClick={onClear}
        className="btn-tier-3 flex-none text-xs px-3 py-1.5"
      >
        Clear
      </button>
    </div>
  );
}
