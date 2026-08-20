import Skeleton from "@/components/ui/skeleton";

// Placeholder for the Who's going strip: circular avatar plus a name bar per
// person, three of them, in the same w-13 columns the real strip uses so the
// row height holds.
export function ParticipantStripSkeleton() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1.5 flex-none w-13"
        >
          <Skeleton className="w-11 h-11 rounded-full" delayIndex={i} />
          <Skeleton className="h-3 w-10 rounded" delayIndex={i} />
        </div>
      ))}
    </div>
  );
}

// Placeholder for the detail header: tag, title, and the two meta lines. Sized
// to the real elements so the shell does not jump when the activity lands.
export function ActivityHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-8 w-3/4 rounded" delayIndex={1} />
      <Skeleton className="h-4 w-1/2 rounded" delayIndex={2} />
      <Skeleton className="h-4 w-2/3 rounded" delayIndex={3} />
    </div>
  );
}
