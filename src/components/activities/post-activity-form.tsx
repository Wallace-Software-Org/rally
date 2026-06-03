"use client";

import { createActivity } from "@/lib/actions/activities";
import ActivityForm, {
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";

export default function PostActivityForm() {
  async function handleSubmit(data: ActivityFormSubmitData) {
    const { error } = await createActivity(data);
    return { error };
  }

  return <ActivityForm mode="new" onSubmit={handleSubmit} />;
}
