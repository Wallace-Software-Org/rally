import { createActivity } from "@/lib/actions/activities";
import ActivityForm, {
  type ActivityFormInitialData,
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";
import BackButton from "@/components/ui/back-button";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Optional prefill from query params (used by the Repeat flow, which advances
// the date 7 days). With no params this is the plain "New activity" form.
function buildInitialData(params: {
  [key: string]: string | string[] | undefined;
}): ActivityFormInitialData {
  return {
    title: firstValue(params.title),
    sport: firstValue(params.sport),
    location_name: firstValue(params.location),
    description: firstValue(params.description),
    skill_level: firstValue(params.skill_level),
    visibility:
      firstValue(params.visibility) === "private" ? "private" : "public",
    max_participants: parseNumber(firstValue(params.max_participants)),
    external_link: firstValue(params.external_link),
    starts_at: firstValue(params.starts_at) || null,
    lat: parseNumber(firstValue(params.lat)),
    lng: parseNumber(firstValue(params.lng)),
  };
}

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialData = buildInitialData(params);

  async function handleSubmit(data: ActivityFormSubmitData) {
    "use server";

    const { error } = await createActivity(data);
    if (error) return { error };
  }

  return (
    <>
      <BackButton />
      <ActivityForm
        mode="new"
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    </>
  );
}
