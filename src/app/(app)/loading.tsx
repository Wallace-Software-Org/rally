import ActivityCardSkeleton from "@/components/activities/activity-card-skeleton";
import MapSkeleton from "@/components/map/map-skeleton";
import Skeleton from "@/components/ui/skeleton";

// Feed skeleton. Mirrors both layout trees in activity-feed.tsx: below xl a map
// strip over a filter row and a card grid, at xl the 720px card panel beside the
// map. The nav comes from the layout above and is already on screen.
function FilterBarSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-full" delayIndex={i} />
      ))}
    </>
  );
}

export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      {/* Map strip — below xl */}
      <div className="xl:hidden flex-none">
        <MapSkeleton className="h-40 rounded-none" />
      </div>

      {/* Filter bar — below xl */}
      <div className="xl:hidden flex-none border-b border-brand-border">
        <div className="flex flex-nowrap items-center gap-2.5 px-4 py-3">
          <FilterBarSkeleton />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Card grid — below xl */}
        <div className="xl:hidden flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
              <ActivityCardSkeleton />
              <ActivityCardSkeleton delayIndex={1} />
            </div>
          </div>
        </div>

        {/* xl: 720px card panel + map */}
        <div className="hidden xl:flex flex-1 overflow-hidden">
          <div className="w-180 flex-none flex flex-col border-r border-brand-border">
            <div className="flex-none border-b border-brand-border px-6 flex items-center gap-2 py-3">
              <FilterBarSkeleton />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <ActivityCardSkeleton />
                  <ActivityCardSkeleton delayIndex={1} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <MapSkeleton className="flex-1 rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
