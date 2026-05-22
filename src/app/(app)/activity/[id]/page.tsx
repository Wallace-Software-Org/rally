import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import ActivityDetailView from "@/components/activities/activity-detail";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activity = await getActivityById(id);

  if (!activity) notFound();

  return (
    <ActivityDetailView
      activity={activity}
      userId={user?.id ?? null}
    />
  );
}
