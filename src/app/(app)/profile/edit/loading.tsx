import Skeleton from "@/components/ui/skeleton";

// Placeholder for edit-profile-form.tsx: avatar, full name, username, bio,
// Instagram handle, the activities toggle, the email notifications row, then
// Save changes and Sign out. Single max-w-lg column at every width, as the real
// form is.
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

export default function Loading() {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-brand-bg overflow-hidden">
      <div className="page-with-back flex-1 overflow-y-auto">
        <div className="px-4 pt-6 pb-4 max-w-lg mx-auto w-full">
          <h1 className="text-xl font-semibold text-brand-text">
            Edit profile
          </h1>
        </div>

        <div className="flex flex-col gap-5 px-4 pt-6 pb-10 max-w-lg mx-auto w-full">
          {/* Avatar */}
          <Skeleton className="w-24 h-24 rounded-full" />

          <FieldSkeleton labelWidth="w-20" delayIndex={1} />
          <FieldSkeleton labelWidth="w-20" delayIndex={2} />
          <FieldSkeleton labelWidth="w-8" height="h-24" delayIndex={3} />
          <FieldSkeleton labelWidth="w-32" delayIndex={4} />

          {/* Activities toggle row */}
          <div className="flex items-center gap-2 py-1 my-4">
            <Skeleton className="h-4 w-24 rounded" delayIndex={5} />
          </div>

          <div className="border-t-[0.5px] border-brand-border" />

          {/* Email notifications */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-full rounded" delayIndex={1} />
            </div>
            <Skeleton className="h-6 w-11 rounded-full flex-none" delayIndex={2} />
          </div>

          <div className="border-t-[0.5px] border-brand-border" />

          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" delayIndex={1} />
        </div>
      </div>
    </div>
  );
}
