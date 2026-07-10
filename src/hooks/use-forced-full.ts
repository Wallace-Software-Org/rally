"use client";

import { useState } from "react";

/**
 * A capacity-rejection "Full" override that flips a join surface to Full at once
 * (before realtime or a router.refresh re-seed catches up), then releases.
 *
 * It is a bridge, not a latch: as soon as the live count reaches max_participants
 * the override clears, because real data has now confirmed fullness and the live
 * count can drive the display. A subsequent leave (realtime DELETE) then reopens
 * the surface naturally. Clearing on catch-UP to full, not on being below full,
 * avoids clearing before the fill is observed.
 *
 * The clear runs during render — React's endorsed pattern for reconciling state
 * to changed data — so there is no extra effect pass and no cascading render.
 */
export function useForcedFull(
  count: number,
  max: number | null,
): [boolean, (value: boolean) => void] {
  const [forcedFull, setForcedFull] = useState(false);
  if (forcedFull && max !== null && count >= max) {
    setForcedFull(false);
  }
  return [forcedFull, setForcedFull];
}
