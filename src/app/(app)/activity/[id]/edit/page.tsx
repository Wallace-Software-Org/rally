import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import EditActivityForm from "@/components/activities/edit-activity-form";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [activity, { data: { user } }] = await Promise.all([
    getActivityById(id),
    supabase.auth.getUser(),
  ]);

  if (!activity) notFound();
  if (!user || user.id !== activity.creator_id) redirect(`/activity/${id}`);

  return <EditActivityForm activity={activity} />;
}
