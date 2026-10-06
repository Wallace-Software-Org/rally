import {
  ActivityHeaderSkeleton,
  ParticipantStripSkeleton,
} from "@/components/activities/activity-detail-skeleton";
import MapSkeleton from "@/components/map/map-skeleton";
import Skeleton from "@/components/ui/skeleton";

// Activity detail skeleton. Mirrors activity-detail.tsx: single column below xl
// with the sticky action bar at the bottom, main column plus right rail at xl.
export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      <div className="page-with-back flex-1 overflow-y-auto px-3">
        <div className="xl:max-w-5xl xl:mx-auto xl:px-8 xl:flex xl:items-start xl:gap-10 xl:pt-8">
          {/* Main column */}
          <div className="flex-1 max-w-2xl mx-auto px-4 md:px-6 xl:max-w-none xl:mx-0 xl:px-0 py-6 flex flex-col gap-6">
            <ActivityHeaderSkeleton />

            {/* Host block */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32 rounded" delayIndex={1} />
                <Skeleton className="h-3 w-20 rounded" delayIndex={2} />
              </div>
            </div>

            {/* Location and mini map — below xl */}
            <div className="xl:hidden flex flex-col gap-3">
              <div className="h-px bg-brand-border" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" delayIndex={1} />
              <MapSkeleton className="h-44 overflow-hidden" />
            </div>

            <div className="h-px bg-brand-border" />

            {/* Who's going */}
            <div>
              <Skeleton className="mb-3 h-3 w-24 rounded" />
              <ParticipantStripSkeleton />
            </div>

            {/* Inline secondary action — below xl */}
            <div className="xl:hidden flex flex-col items-center gap-3">
              <Skeleton className="h-11 w-full max-w-156 rounded-xl" />
            </div>
          </div>

          {/* Right rail — xl only */}
          <div className="hidden xl:flex flex-col gap-4 w-72 flex-none py-6">
            <MapSkeleton className="h-52 overflow-hidden" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-11 w-full rounded-xl" delayIndex={1} />
              <Skeleton className="h-11 w-full rounded-xl" delayIndex={2} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action bar — below xl */}
      <div className="xl:hidden flex-none border-t border-brand-border bg-brand-bg p-3 flex flex-col items-center gap-2">
        <Skeleton className="h-11 w-full max-w-156 rounded-xl" />
      </div>
    </div>
  );
}
