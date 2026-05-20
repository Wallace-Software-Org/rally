import { describe, it, expect } from "vitest";
import { matchesDateFilter } from "@/lib/utils/date-filters";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Compute dates dynamically so tests are valid whenever they run.

function mondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
}

function at(base: Date, dayOffset: number, hour = 12): string {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    hour,
  ).toISOString();
}

function today(hour = 12): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).toISOString();
}

const mon = mondayOfCurrentWeek();

// ── "all" filter ──────────────────────────────────────────────────────────────

describe('matchesDateFilter — "all"', () => {
  it("returns true for a past date", () => {
    expect(matchesDateFilter(at(mon, -30), "all")).toBe(true);
  });

  it("returns true for today", () => {
    expect(matchesDateFilter(today(), "all")).toBe(true);
  });

  it("returns true for a far-future date", () => {
    expect(matchesDateFilter(at(mon, 365), "all")).toBe(true);
  });
});

// ── "today" filter ────────────────────────────────────────────────────────────

describe('matchesDateFilter — "today"', () => {
  it("matches noon today", () => {
    expect(matchesDateFilter(today(12), "today")).toBe(true);
  });

  it("matches start of today (midnight)", () => {
    expect(matchesDateFilter(today(0), "today")).toBe(true);
  });

  it("matches end of today (23:59)", () => {
    expect(matchesDateFilter(today(23), "today")).toBe(true);
  });

  it("does not match yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12);
    expect(matchesDateFilter(yesterday.toISOString(), "today")).toBe(false);
  });

  it("does not match tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12);
    expect(matchesDateFilter(tomorrow.toISOString(), "today")).toBe(false);
  });
});

// ── "this-week" filter (ISO Mon–Sun) ──────────────────────────────────────────

describe('matchesDateFilter — "this-week"', () => {
  it("matches Monday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 0), "this-week")).toBe(true);
  });

  it("matches Wednesday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 2), "this-week")).toBe(true);
  });

  it("matches Saturday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 5), "this-week")).toBe(true);
  });

  it("matches Sunday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 6), "this-week")).toBe(true);
  });

  it("does not match the Sunday before this week (previous ISO week)", () => {
    // mon - 1 day = last Sunday, which belongs to the previous ISO week
    expect(matchesDateFilter(at(mon, -1), "this-week")).toBe(false);
  });

  it("does not match next Monday (first day of next ISO week)", () => {
    expect(matchesDateFilter(at(mon, 7), "this-week")).toBe(false);
  });
});

// ── "this-weekend" filter (Sat–Sun of current ISO week) ──────────────────────

describe('matchesDateFilter — "this-weekend"', () => {
  it("matches Saturday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 5), "this-weekend")).toBe(true);
  });

  it("matches Sunday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 6), "this-weekend")).toBe(true);
  });

  it("does not match Monday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 0), "this-weekend")).toBe(false);
  });

  it("does not match Friday of the current ISO week", () => {
    expect(matchesDateFilter(at(mon, 4), "this-weekend")).toBe(false);
  });

  it("does not match next Saturday (next ISO week's weekend)", () => {
    expect(matchesDateFilter(at(mon, 12), "this-weekend")).toBe(false);
  });
});

// ── "next-week" filter (ISO Mon–Sun of next week) ────────────────────────────

describe('matchesDateFilter — "next-week"', () => {
  it("matches next Monday", () => {
    expect(matchesDateFilter(at(mon, 7), "next-week")).toBe(true);
  });

  it("matches next Wednesday", () => {
    expect(matchesDateFilter(at(mon, 9), "next-week")).toBe(true);
  });

  it("matches next Sunday", () => {
    expect(matchesDateFilter(at(mon, 13), "next-week")).toBe(true);
  });

  it("does not match this Sunday (current ISO week)", () => {
    expect(matchesDateFilter(at(mon, 6), "next-week")).toBe(false);
  });

  it("does not match the Monday two weeks out", () => {
    expect(matchesDateFilter(at(mon, 14), "next-week")).toBe(false);
  });
});
