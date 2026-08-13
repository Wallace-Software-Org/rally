import { describe, it, expect } from "vitest";
import type { ActivityWithParticipants } from "@/types";
import {
  coordKey,
  isAtCoordKey,
  groupActivitiesByCoord,
} from "@/lib/utils/map-groups";

// Minimal activity factory: the grouping helpers read coordinates and the
// location name only.
function act(
  id: string,
  lat: number | null,
  lng: number | null,
  locationName = "Chaparral Dog Park",
): ActivityWithParticipants {
  return {
    id,
    lat,
    lng,
    location_name: locationName,
  } as unknown as ActivityWithParticipants;
}

const PARK = { lat: 33.5771, lng: -111.9261 };

describe("coordKey", () => {
  it("is equal for coordinates that match to 5 decimals", () => {
    expect(coordKey(33.577123, -111.926144)).toBe(
      coordKey(33.5771234, -111.9261441),
    );
  });

  it("differs once the 5th decimal differs (~1m apart)", () => {
    expect(coordKey(33.57712, -111.92614)).not.toBe(
      coordKey(33.57713, -111.92614),
    );
  });
});

describe("groupActivitiesByCoord", () => {
  it("collapses a repeat series at one venue into a single group", () => {
    const groups = groupActivitiesByCoord([
      act("mon", PARK.lat, PARK.lng),
      act("wed", PARK.lat, PARK.lng),
      act("fri", PARK.lat, PARK.lng),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].activities.map((a) => a.id)).toEqual([
      "mon",
      "wed",
      "fri",
    ]);
    expect(groups[0].locationName).toBe("Chaparral Dog Park");
    expect(groups[0].lat).toBe(PARK.lat);
  });

  it("keeps distinct venues in separate groups, first-appearance order", () => {
    const groups = groupActivitiesByCoord([
      act("park", PARK.lat, PARK.lng),
      act("gym", 33.4942, -111.9261, "Camelback Gym"),
      act("park-2", PARK.lat, PARK.lng),
    ]);

    expect(groups.map((g) => g.activities.length)).toEqual([2, 1]);
    expect(groups[1].locationName).toBe("Camelback Gym");
  });

  it("drops activities with no coordinates", () => {
    const groups = groupActivitiesByCoord([
      act("park", PARK.lat, PARK.lng),
      act("nowhere", null, null),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].activities.map((a) => a.id)).toEqual(["park"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupActivitiesByCoord([])).toEqual([]);
  });
});

describe("isAtCoordKey", () => {
  const key = coordKey(PARK.lat, PARK.lng);

  it("matches an activity at the group's coordinates", () => {
    expect(isAtCoordKey(act("park", PARK.lat, PARK.lng), key)).toBe(true);
  });

  it("rejects other coordinates and missing ones", () => {
    expect(isAtCoordKey(act("gym", 33.4942, -111.9261), key)).toBe(false);
    expect(isAtCoordKey(act("nowhere", null, null), key)).toBe(false);
  });
});
