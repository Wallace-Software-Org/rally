import Skeleton from "@/components/ui/skeleton";

// Placeholder for a map, sized by the caller to the real map's height: the
// detail mini map (h-44 mobile, h-52 at xl), the feed strip (h-40), or the feed
// panel (flex-1). One block, no inner detail, since a map has no layout to
// stand in for.
export default function MapSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return <Skeleton className={`w-full rounded-xl ${className}`} />;
}
