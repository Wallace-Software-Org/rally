import { SPORTS_LIST } from "@/lib/utils/sport-config";

// Sports are stored lowercase; "All" is a filter sentinel, not a real sport.
const SPORT_KEYS = new Set(
  SPORTS_LIST.filter((s) => s !== "All").map((s) => s.toLowerCase()),
);

export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 200;
export const MAX_PARTICIPANTS_MIN = 2;
export const MAX_PARTICIPANTS_MAX = 20;

export function isValidSport(sport: string): boolean {
  return SPORT_KEYS.has(sport.trim().toLowerCase());
}

export type ActivityInput = {
  sport: string;
  title: string;
  description: string;
  starts_at: string;
  max_participants: number | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
};

// Server-side bounds check mirroring the create/edit form. Returns an error
// string, or null when the input is valid. requireFuture is set on create so a
// new activity can't be scheduled in the past (edits may keep an existing date).
export function validateActivityInput(
  data: ActivityInput,
  opts: { requireFuture: boolean },
): string | null {
  if (!isValidSport(data.sport)) return "Choose a valid sport";

  const title = data.title.trim();
  if (!title) return "Title is required";
  if (title.length > TITLE_MAX) return "Title is too long";

  const description = data.description.trim();
  if (description.length < DESCRIPTION_MIN)
    return `Description must be at least ${DESCRIPTION_MIN} characters`;
  if (description.length > DESCRIPTION_MAX) return "Description is too long";

  if (!data.location_name.trim()) return "Location is required";
  if (data.location_name.length > LOCATION_MAX) return "Location is too long";

  if (data.max_participants !== null) {
    if (
      !Number.isInteger(data.max_participants) ||
      data.max_participants < MAX_PARTICIPANTS_MIN ||
      data.max_participants > MAX_PARTICIPANTS_MAX
    ) {
      return `Spots must be between ${MAX_PARTICIPANTS_MIN} and ${MAX_PARTICIPANTS_MAX}`;
    }
  }

  if (
    data.lat !== null &&
    (!Number.isFinite(data.lat) || data.lat < -90 || data.lat > 90)
  )
    return "Invalid location";
  if (
    data.lng !== null &&
    (!Number.isFinite(data.lng) || data.lng < -180 || data.lng > 180)
  )
    return "Invalid location";

  if (opts.requireFuture) {
    const t = new Date(data.starts_at).getTime();
    if (!Number.isFinite(t)) return "Invalid date";
    if (t <= Date.now()) return "Start time must be in the future";
  }

  return null;
}
