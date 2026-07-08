import { describe, it, expect } from "vitest";
import { nextWeeklyOccurrence } from "@/lib/utils/next-occurrence";

// 2026-07-01 17:00 UTC is a Wednesday.
const WED_1700 = "2026-07-01T17:00:00.000Z";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const weekday = (iso: string) => new Date(iso).getUTCDay();

describe("nextWeeklyOccurrence", () => {
  it("advances a past date to the next future occurrence of the same weekday/time", () => {
    // now = Sunday 2026-07-05, so the next Wednesday 17:00 is 2026-07-08.
    const now = new Date("2026-07-05T12:00:00.000Z");
    const result = nextWeeklyOccurrence(WED_1700, now);
    expect(result).toBe("2026-07-08T17:00:00.000Z");
    expect(weekday(result)).toBe(weekday(WED_1700));
  });

  it("returns today when the weekday matches and the time is still ahead", () => {
    // now = Wednesday 2026-07-08 at 09:00, source time 17:00 is later today.
    const now = new Date("2026-07-08T09:00:00.000Z");
    expect(nextWeeklyOccurrence(WED_1700, now)).toBe("2026-07-08T17:00:00.000Z");
  });

  it("rolls to next week when the weekday matches but the time has passed", () => {
    // now = Wednesday 2026-07-08 at 18:00, past the 17:00 time.
    const now = new Date("2026-07-08T18:00:00.000Z");
    expect(nextWeeklyOccurrence(WED_1700, now)).toBe("2026-07-15T17:00:00.000Z");
  });

  it("rolls to next week when the instant equals now exactly", () => {
    const now = new Date(WED_1700);
    expect(nextWeeklyOccurrence(WED_1700, now)).toBe("2026-07-08T17:00:00.000Z");
  });

  it("never returns a past instant, even for very old sources", () => {
    const old = "2024-01-03T17:00:00.000Z"; // also a Wednesday
    const now = new Date("2026-07-05T12:00:00.000Z");
    const result = new Date(nextWeeklyOccurrence(old, now)).getTime();
    expect(result).toBeGreaterThan(now.getTime());
    expect(weekday(new Date(result).toISOString())).toBe(weekday(old));
    // A whole number of weeks after the source.
    expect((result - new Date(old).getTime()) % WEEK_MS).toBe(0);
  });
});
