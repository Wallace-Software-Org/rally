import { describe, it, expect } from "vitest";
import type { ActivityWithParticipants } from "@/types";
import {
  localDayKey,
  buildMonthGrid,
  groupActivitiesByDay,
  agendaForMonth,
  addMonths,
  isBeforeCurrentMonth,
  monthLabel,
  keyToDate,
  nextDayWithActivities,
  longDayLabel,
} from "@/lib/utils/calendar";

// Minimal activity factory. starts_at strings are timezone-naive (no Z), so
// `new Date()` parses them as viewer-local wall-clock — the same frame the
// helpers bucket in — which keeps these assertions deterministic across CI TZs.
function act(id: string, startsAt: string): ActivityWithParticipants {
  return {
    id,
    starts_at: startsAt,
    // Fields the calendar helpers ignore; typed loosely for the fixture.
  } as unknown as ActivityWithParticipants;
}

describe("localDayKey (viewer-local)", () => {
  it("reads the local calendar day, including just before midnight", () => {
    expect(localDayKey(new Date(2026, 6, 15, 23, 59))).toBe("2026-07-15");
    expect(localDayKey(new Date(2026, 6, 16, 0, 1))).toBe("2026-07-16");
  });

  it("zero-pads month and day", () => {
    expect(localDayKey(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });
});

describe("groupActivitiesByDay", () => {
  it("buckets across a local midnight boundary into separate days", () => {
    const grouped = groupActivitiesByDay([
      act("late", "2026-07-15T23:30:00"),
      act("early", "2026-07-16T00:15:00"),
    ]);

    expect([...grouped.keys()].sort()).toEqual(["2026-07-15", "2026-07-16"]);
    expect(grouped.get("2026-07-15")!.map((a) => a.id)).toEqual(["late"]);
    expect(grouped.get("2026-07-16")!.map((a) => a.id)).toEqual(["early"]);
  });

  it("buckets across a month boundary", () => {
    const grouped = groupActivitiesByDay([
      act("jul", "2026-07-31T20:00:00"),
      act("aug", "2026-08-01T09:00:00"),
    ]);

    expect(grouped.has("2026-07-31")).toBe(true);
    expect(grouped.has("2026-08-01")).toBe(true);
  });

  it("orders activities within a day earliest first", () => {
    const grouped = groupActivitiesByDay([
      act("noon", "2026-07-15T12:00:00"),
      act("morning", "2026-07-15T08:00:00"),
      act("evening", "2026-07-15T18:30:00"),
    ]);

    expect(grouped.get("2026-07-15")!.map((a) => a.id)).toEqual([
      "morning",
      "noon",
      "evening",
    ]);
  });

  it("skips activities without a start time", () => {
    const grouped = groupActivitiesByDay([
      act("ok", "2026-07-15T12:00:00"),
      { id: "none", starts_at: null } as unknown as ActivityWithParticipants,
    ]);

    expect(grouped.size).toBe(1);
    expect(grouped.has("2026-07-15")).toBe(true);
  });
});

describe("buildMonthGrid", () => {
  it("returns 42 cells starting on a Sunday", () => {
    const cells = buildMonthGrid({ year: 2026, month: 6 });
    expect(cells).toHaveLength(42);
    expect(cells[0].date.getDay()).toBe(0);
  });

  it("flags in-month days", () => {
    // July 2026 starts on a Wednesday, so the grid begins Sun Jun 28.
    const cells = buildMonthGrid({ year: 2026, month: 6 });

    expect(cells[0].key).toBe("2026-06-28");
    expect(cells[0].inMonth).toBe(false);
    expect(cells.find((c) => c.key === "2026-07-01")!.inMonth).toBe(true);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });
});

describe("agendaForMonth", () => {
  const grouped = groupActivitiesByDay([
    act("past", "2026-07-05T10:00:00"),
    act("today", "2026-07-10T10:00:00"),
    act("later", "2026-07-22T10:00:00"),
    act("nextmonth", "2026-08-02T10:00:00"),
  ]);

  it("keeps only this month's days from today forward, chronological", () => {
    const now = new Date(2026, 6, 10, 0, 0);
    const groups = agendaForMonth(grouped, { year: 2026, month: 6 }, now);

    expect(groups.map((g) => g.key)).toEqual(["2026-07-10", "2026-07-22"]);
    expect(groups[0].activities.map((a) => a.id)).toEqual(["today"]);
  });

  it("excludes other months", () => {
    const now = new Date(2026, 7, 1, 0, 0);
    const groups = agendaForMonth(grouped, { year: 2026, month: 7 }, now);
    expect(groups.map((g) => g.key)).toEqual(["2026-08-02"]);
  });
});

describe("month navigation helpers", () => {
  it("addMonths normalizes across year boundaries", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({
      year: 2027,
      month: 0,
    });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("isBeforeCurrentMonth caps at the current month", () => {
    const now = new Date(2026, 6, 15);
    expect(isBeforeCurrentMonth({ year: 2026, month: 5 }, now)).toBe(true);
    expect(isBeforeCurrentMonth({ year: 2026, month: 6 }, now)).toBe(false);
    expect(isBeforeCurrentMonth({ year: 2026, month: 7 }, now)).toBe(false);
  });

  it("monthLabel formats as 'Month YYYY'", () => {
    expect(monthLabel({ year: 2026, month: 6 })).toBe("July 2026");
  });
});

describe("keyToDate", () => {
  it("round-trips a day key to a local-midnight date", () => {
    const d = keyToDate("2026-08-16");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(16);
    expect(localDayKey(d)).toBe("2026-08-16");
  });
});

describe("nextDayWithActivities", () => {
  const grouped = groupActivitiesByDay([
    act("a", "2026-08-16T09:00:00"),
    act("b", "2026-08-20T18:00:00"),
  ]);

  it("returns the earliest activity day strictly after the given key", () => {
    expect(nextDayWithActivities(grouped, "2026-08-16")?.key).toBe("2026-08-20");
    expect(nextDayWithActivities(grouped, "2026-08-10")?.key).toBe("2026-08-16");
  });

  it("returns null when nothing follows", () => {
    expect(nextDayWithActivities(grouped, "2026-08-20")).toBeNull();
    expect(nextDayWithActivities(new Map(), "2026-08-16")).toBeNull();
  });
});

describe("day labels", () => {
  it("longDayLabel reads 'Weekday, Month D'", () => {
    // 2026-08-16 is a Sunday.
    expect(longDayLabel(keyToDate("2026-08-16"))).toBe("Sunday, August 16");
  });
});
