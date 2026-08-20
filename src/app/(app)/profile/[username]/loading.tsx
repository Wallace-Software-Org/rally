import ActivityCardSkeleton from "@/components/activities/activity-card-skeleton";
import Skeleton from "@/components/ui/skeleton";

// Profile skeleton. Mirrors profile-view.tsx: below xl the compact left-aligned
// identity block over the tab row, at xl the sidebar card beside the tab column.
function IdentityBlockSkeleton() {
  return (
    <div className="flex flex-col gap-4 xl:items-center">
      <div className="w-full flex items-center gap-3.5 xl:flex-col xl:gap-4">
        <Skeleton className="w-15 h-15 xl:w-22.5 xl:h-22.5 rounded-full flex-none" />
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 xl:flex-none xl:items-center">
          <Skeleton className="h-5 w-36 rounded" delayIndex={1} />
          <Skeleton className="h-3.5 w-24 rounded" delayIndex={2} />
          <Skeleton className="xl:hidden h-3.5 w-40 rounded" delayIndex={3} />
        </div>
      </div>
      <Skeleton className="h-4 w-full max-w-64 rounded" delayIndex={4} />
      <div className="w-full flex gap-2 xl:flex-col">
        <Skeleton className="h-11 flex-1 xl:w-full rounded-[10px]" />
        <Skeleton className="h-11 flex-1 xl:w-full rounded-[10px]" delayIndex={1} />
      </div>
    </div>
  );
}

function TabRowSkeleton() {
  return (
    <div className="flex">
      {[0, 1].map((i) => (
        <div key={i} className="flex-1 py-3 flex justify-center">
          <Skeleton className="h-4 w-24 rounded" delayIndex={i} />
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-brand-bg">
      {/* Below xl */}
      <div className="xl:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-140 mx-auto">
            <div className="px-6 pt-6 pb-7 flex flex-col gap-5">
              <IdentityBlockSkeleton />
            </div>
            <div className="border-b border-brand-border">
              <TabRowSkeleton />
            </div>
            <div className="px-4 py-4 flex flex-col gap-3">
              <ActivityCardSkeleton />
              <ActivityCardSkeleton delayIndex={1} />
            </div>
          </div>
        </div>
      </div>

      {/* xl */}
      <div className="hidden xl:flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 max-w-6xl xl:max-w-7xl mx-auto flex min-h-0 pt-6 xl:pt-12 gap-6">
          <div className="flex flex-col overflow-y-auto px-5 py-6 gap-4 xl:w-96">
            <div className="w-full bg-brand-surface border border-brand-border rounded-xl p-5">
              <IdentityBlockSkeleton />
            </div>
            <div className="w-full bg-brand-surface border border-brand-border rounded-xl p-4 flex gap-4">
              <Skeleton className="h-12 flex-1 rounded" />
              <Skeleton className="h-12 flex-1 rounded" delayIndex={1} />
            </div>
          </div>

          <div className="flex flex-col min-h-0 overflow-hidden px-6 xl:w-2xl 2xl:w-3xl">
            <div className="flex-none border-b border-brand-border">
              <TabRowSkeleton />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
              <ActivityCardSkeleton />
              <ActivityCardSkeleton delayIndex={1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
