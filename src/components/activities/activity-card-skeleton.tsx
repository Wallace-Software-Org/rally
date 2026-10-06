import Skeleton from "@/components/ui/skeleton";

// Placeholder for ActivityCardDesktop, used by the feed and the profile tabs.
// Keeps the real card's shell (rounded-xl, border, px-4 py-5) so only the
// contents are stand-ins: tag pill and time on the top row, title, meta line,
// then the avatar row pinned to the bottom.
export default function ActivityCardSkeleton({
  delayIndex = 0,
}: {
  delayIndex?: number;
}) {
  return (
    <div className="h-full min-h-45 rounded-xl px-4 py-5 flex flex-col gap-1 border border-brand-border bg-brand-bg">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-20 rounded-full" delayIndex={delayIndex} />
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Skeleton className="h-3.5 w-14 rounded" delayIndex={delayIndex} />
          <Skeleton className="h-3.5 w-10 rounded" delayIndex={delayIndex} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <Skeleton className="h-5 w-3/4 rounded" delayIndex={delayIndex} />
        <Skeleton className="h-3.5 w-1/2 rounded" delayIndex={delayIndex} />
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <div className="flex -space-x-1.5 flex-none">
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              className="w-7 h-7 rounded-full border-[1.5px] border-brand-bg"
              delayIndex={delayIndex + i}
            />
          ))}
        </div>
        <Skeleton className="h-3.5 w-16 rounded" delayIndex={delayIndex} />
      </div>
    </div>
  );
}
