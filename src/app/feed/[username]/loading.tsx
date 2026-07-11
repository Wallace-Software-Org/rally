// Skeleton for the personal feed while the segment loads. Mirrors both layout
// trees: a map block where the map sits and two card outlines in the list
// column, at the same proportions as personal-feed.tsx.

function HostStripSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-brand-card flex-none" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-32 rounded bg-brand-card" />
        <div className="h-3 w-20 rounded bg-brand-card" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="h-40 rounded-xl border border-brand-border bg-brand-bg px-4 py-5 flex flex-col gap-3 animate-pulse">
      <div className="h-4 w-20 rounded-full bg-brand-card" />
      <div className="h-4 w-3/4 rounded bg-brand-card" />
      <div className="h-3 w-1/2 rounded bg-brand-card" />
      <div className="mt-auto h-5 w-16 rounded-full bg-brand-card" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {/* ── Header bar — holds the h-14 slot so content doesn't jump when the
          real header mounts ── */}
      <header className="flex-none border-b border-brand-border bg-brand-bg">
        <div className="max-w-5xl xl:max-w-none mx-auto px-4 xl:px-6 h-14 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-teal block" />
          <span className="text-base font-semibold tracking-tight text-brand-text">
            Rally
          </span>
        </div>
      </header>

      {/* ── Map strip — mobile, md, lg (< xl) ── */}
      <div className="xl:hidden flex-none">
        <div className="h-40 w-full bg-brand-surface animate-pulse" />
      </div>

      {/* ── Host strip slot (< xl) ── */}
      <div className="xl:hidden flex-none border-b border-brand-border px-4 py-3">
        <HostStripSkeleton />
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mobile + md + lg: single card grid */}
        <div className="xl:hidden flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        </div>

        {/* xl: fixed 720px left panel + map fills remaining space */}
        <div className="hidden xl:flex flex-1 overflow-hidden">
          <div className="w-180 flex-none flex flex-col border-r border-brand-border">
            <div className="flex-none border-b border-brand-border px-6 py-3">
              <HostStripSkeleton />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </div>
            </div>
          </div>

          {/* Map block — fills remaining space */}
          <div className="flex-1 bg-brand-surface animate-pulse" />
        </div>
      </div>
    </div>
  );
}
