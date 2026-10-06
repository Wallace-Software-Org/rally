import ActivityFormSkeleton from "@/components/activities/activity-form-skeleton";

// Same form and same heading as the New route: activity-form.tsx only titles
// the Edit mode differently.
export default function Loading() {
  return <ActivityFormSkeleton heading="New activity" />;
}
