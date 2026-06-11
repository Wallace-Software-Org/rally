import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivityById } from "@/lib/queries/activities";
import { updateActivity } from "@/lib/actions/activities";
import ActivityForm, {
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";

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

  async function handleSubmit(data: ActivityFormSubmitData) {
    "use server";

    const { error } = await updateActivity(id, {
      sport: data.sport,
      title: data.title,
      description: data.description,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      visibility: data.visibility,
      max_participants: data.max_participants,
      skill_level: data.skill_level,
      external_link: data.external_link,
      location_name: data.location_name,
      lat: data.lat,
      lng: data.lng,
    });

    if (error) return { error };
    redirect(`/activity/${id}`);
  }

  return <ActivityForm initialData={activity} mode="edit" onSubmit={handleSubmit} />;
}
