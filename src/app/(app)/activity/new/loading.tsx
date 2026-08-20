import ActivityFormSkeleton from "@/components/activities/activity-form-skeleton";

// activity-form.tsx titles both New and Duplicate "New activity".
export default function Loading() {
  return <ActivityFormSkeleton heading="New activity" />;
}
