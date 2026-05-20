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

  const [activity, profileResult] = await Promise.all([
    getActivityById(id),
    user
      ? supabase
          .from("profiles")
          .select("avatar_url, full_name, city")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (!activity) notFound();

  return (
    <ActivityDetailView
      activity={activity}
      userId={user?.id ?? null}
      userProfile={profileResult.data ?? null}
    />
  );
}
