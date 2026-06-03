import { createActivity } from "@/lib/actions/activities";
import ActivityForm, {
  type ActivityFormInitialData,
  type ActivityFormSubmitData,
} from "@/components/activities/activity-form";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseMaxParticipants(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCoordinate(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function DuplicateActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialData: ActivityFormInitialData = {
    title: firstValue(params.title),
    sport: firstValue(params.sport),
    location_name: firstValue(params.location),
    description: firstValue(params.description),
    skill_level: firstValue(params.skill_level),
    max_participants: parseMaxParticipants(firstValue(params.max_participants)),
    external_link: firstValue(params.external_link),
    starts_at: firstValue(params.starts_at) || null,
    lat: parseCoordinate(firstValue(params.lat)),
    lng: parseCoordinate(firstValue(params.lng)),
  };

  async function handleSubmit(data: ActivityFormSubmitData) {
    "use server";

    const { error } = await createActivity(data);
    if (error) return { error };
  }

  return (
    <ActivityForm
      initialData={initialData}
      mode="duplicate"
      onSubmit={handleSubmit}
    />
  );
}
