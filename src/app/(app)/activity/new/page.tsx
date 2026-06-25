import { createActivity } from "@/lib/actions/activities";
import ActivityForm, {
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";
import BackButton from "@/components/ui/back-button";

export default function NewActivityPage() {
  async function handleSubmit(data: ActivityFormSubmitData) {
    "use server";

    const { error } = await createActivity(data);
    if (error) return { error };
  }

  return (
    <>
      <BackButton />
      <ActivityForm mode="new" onSubmit={handleSubmit} />
    </>
  );
}
