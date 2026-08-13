import type { ActivityWithParticipants } from "@/types";

// Markers sit at exact coordinates, so activities sharing a venue (a weekly
// repeat, say) stack perfectly: the offset is zero, so they never separate at
// any zoom and only the last one in DOM order is clickable. Group by coordinate
// first and render one pin per place instead.
//
// 5 decimals is roughly a metre, so only genuinely identical venues collapse;
// two spots across a park stay separate pins.
const COORD_PRECISION = 5;

export type ActivityGroup = {
  // Stable id for the place, safe to compare against a stored filter key.
  key: string;
  lat: number;
  lng: number;
  locationName: string;
  activities: ActivityWithParticipants[];
};

export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(COORD_PRECISION)},${lng.toFixed(COORD_PRECISION)}`;
}

export function isAtCoordKey(
  activity: ActivityWithParticipants,
  key: string,
): boolean {
  if (activity.lat == null || activity.lng == null) return false;
  return coordKey(activity.lat, activity.lng) === key;
}

// Activities without coordinates are dropped: they have no pin to render.
// Groups come back in first-appearance order, and each group keeps the input
// order of its activities (the feed queries sort by starts_at).
export function groupActivitiesByCoord(
  activities: ActivityWithParticipants[],
): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();

  for (const activity of activities) {
    if (typeof activity.lat !== "number" || typeof activity.lng !== "number") {
      continue;
    }
    const key = coordKey(activity.lat, activity.lng);
    const existing = groups.get(key);
    if (existing) {
      existing.activities.push(activity);
    } else {
      groups.set(key, {
        key,
        lat: activity.lat,
        lng: activity.lng,
        locationName: activity.location_name,
        activities: [activity],
      });
    }
  }

  return [...groups.values()];
}
