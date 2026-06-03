import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import ActivityDetailView from "@/components/activities/activity-detail";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const postedParam = Array.isArray(query.posted)
    ? query.posted[0]
    : query.posted;
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
      showPostedBanner={postedParam === "true"}
    />
  );
}
