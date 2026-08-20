import Skeleton from "@/components/ui/skeleton";

// Placeholder for activity-form.tsx, shared by the New and Duplicate routes
// since both render the same form. Field heights track field-base at px-4 py-3
// (about 46px for one row), and the two columns split at xl exactly as the real
// form does, so nothing shifts when it lands.

function FieldSkeleton({
  labelWidth,
  height = "h-11.5",
  delayIndex = 0,
}: {
  labelWidth: string;
  height?: string;
  delayIndex?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton
        className={`h-4 ${labelWidth} rounded`}
        delayIndex={delayIndex}
      />
      <Skeleton className={`w-full ${height} rounded-xl`} delayIndex={delayIndex} />
    </div>
  );
}

// The Optional column's toggle cards: a title and subtitle beside a switch,
// inside the real card's border and padding.
function ToggleCardSkeleton({ delayIndex = 0 }: { delayIndex?: number }) {
  return (
    <div className="border border-brand-border bg-brand-input rounded-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-28 rounded" delayIndex={delayIndex} />
          <Skeleton className="h-3 w-36 rounded" delayIndex={delayIndex} />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" delayIndex={delayIndex} />
      </div>
    </div>
  );
}

export default function ActivityFormSkeleton({
  heading,
}: {
  heading: string;
}) {
  return (
    <div className="page-with-back xl:pt-0 flex-1 overflow-y-auto flex flex-col bg-brand-bg">
      <div className="px-4 pt-6 pb-4 max-w-lg xl:max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-brand-text">{heading}</h1>
      </div>

      <div className="px-4 py-2 pb-12 xl:py-8 flex flex-col xl:flex-row xl:items-stretch gap-8 xl:gap-0 max-w-lg xl:max-w-5xl mx-auto w-full">
        {/* Main column: title, sport, location, date, time, description */}
        <div className="flex flex-col gap-5 xl:flex-1 xl:pr-10 min-w-0">
          <FieldSkeleton labelWidth="w-24" />
          <FieldSkeleton labelWidth="w-12" delayIndex={1} />
          <FieldSkeleton labelWidth="w-16" delayIndex={2} />
          <FieldSkeleton labelWidth="w-10" delayIndex={3} />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10 rounded" delayIndex={4} />
            <div className="flex gap-2">
              <Skeleton className="h-11.5 flex-1 rounded-xl" delayIndex={4} />
              <Skeleton className="h-11.5 flex-1 rounded-xl" delayIndex={5} />
            </div>
          </div>
          <FieldSkeleton labelWidth="w-20" height="h-28" delayIndex={5} />
        </div>

        {/* Optional column */}
        <div className="flex flex-col gap-5 xl:w-80 xl:border-l-[0.5px] xl:border-brand-border xl:pl-10 xl:self-stretch">
          <Skeleton className="h-3 w-16 rounded" />
          <FieldSkeleton labelWidth="w-20" delayIndex={1} />
          <ToggleCardSkeleton delayIndex={2} />
          <ToggleCardSkeleton delayIndex={3} />
          <ToggleCardSkeleton delayIndex={4} />
          <div className="flex flex-col gap-2 xl:mt-auto">
            <Skeleton className="h-12 w-full xl:w-40 rounded-xl" delayIndex={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
