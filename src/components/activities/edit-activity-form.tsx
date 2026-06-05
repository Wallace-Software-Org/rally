"use client";

import { useRouter } from "next/navigation";
import { updateActivity } from "@/lib/actions/activities";
import type { ActivityDetail } from "@/types";
import ActivityForm, {
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";

export default function EditActivityForm({
  activity,
}: {
  activity: ActivityDetail;
}) {
  const router = useRouter();

  async function handleSubmit(data: ActivityFormSubmitData) {
    const { error } = await updateActivity(activity.id, {
      sport: data.sport,
      title: data.title,
      description: data.description,
      starts_at: data.starts_at,
      max_participants: data.max_participants,
      skill_level: data.skill_level,
      external_link: data.external_link,
      location_name: data.location_name,
      lat: data.lat,
      lng: data.lng,
      status: data.status,
    });

    if (!error) router.push(`/activity/${activity.id}`);
    return { error };
  }

  return (
    <ActivityForm initialData={activity} mode="edit" onSubmit={handleSubmit} />
  );
}
