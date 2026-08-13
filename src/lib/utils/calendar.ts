import type { ActivityWithParticipants } from "@/types";

// Calendar helpers for the feed's month view. All bucketing is viewer-local:
// day membership is read off a Date's local components (getFullYear/Month/Date),
// so an activity at 11:30pm local lands on that local day, not the UTC day.

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type YearMonth = { year: number; month: number }; // month: 0-11

export type DayCell = {
  date: Date; // local midnight of this cell
  key: string; // YYYY-MM-DD, viewer-local
  inMonth: boolean; // belongs to the displayed month
  isToday: boolean;
};

export type DayGroup = {
  key: string;
  date: Date;
  activities: ActivityWithParticipants[];
};

// Viewer-local YYYY-MM-DD. Zero-padded so string comparison matches chronology.
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

// Shift a year/month by whole months, normalizing the year on over/underflow.
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// True when the given month falls before the month containing `now` (used to cap
// the prev-month chevron at the current month).
export function isBeforeCurrentMonth(
  { year, month }: YearMonth,
  now: Date,
): boolean {
  return (
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth())
  );
}

export function currentYearMonth(now: Date): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() };
}

// Sunday-first 6-week (42 cell) grid covering the displayed month plus the
// leading/trailing days needed to fill the weeks.
export function buildMonthGrid(
  { year, month }: YearMonth,
  now: Date,
): DayCell[] {
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday
  const todayKey = localDayKey(now);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - startOffset + i);
    const key = localDayKey(date);
    cells.push({
      date,
      key,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
    });
  }
  return cells;
}

// Bucket activities by their viewer-local start day; within a day, earliest
// first. Skips activities without a start time.
export function groupActivitiesByDay(
  activities: ActivityWithParticipants[],
): Map<string, ActivityWithParticipants[]> {
  const map = new Map<string, ActivityWithParticipants[]>();
  for (const activity of activities) {
    if (!activity.starts_at) continue;
    const key = localDayKey(new Date(activity.starts_at));
    const bucket = map.get(key);
    if (bucket) bucket.push(activity);
    else map.set(key, [activity]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) =>
      a.starts_at! < b.starts_at! ? -1 : a.starts_at! > b.starts_at! ? 1 : 0,
    );
  }
  return map;
}

// Parse a viewer-local YYYY-MM-DD key back to a local-midnight Date.
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "Sunday, August 16" — the selected-day header above the calendar's day list.
export function longDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// "Aug 16" — compact date for the map legend.
export function shortDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The earliest day strictly after `afterKey` that has at least one activity, or
// null. Powers the empty-day state ("nothing today, next is ...").
export function nextDayWithActivities(
  grouped: Map<string, ActivityWithParticipants[]>,
  afterKey: string,
): { key: string; date: Date } | null {
  let best: string | null = null;
  for (const key of grouped.keys()) {
    if (key <= afterKey) continue;
    if (best === null || key < best) best = key;
  }
  return best === null ? null : { key: best, date: keyToDate(best) };
}

// Agenda for one month: days in that month, from today forward, that have at
// least one activity, ordered chronologically.
export function agendaForMonth(
  grouped: Map<string, ActivityWithParticipants[]>,
  { year, month }: YearMonth,
  now: Date,
): DayGroup[] {
  const todayKey = localDayKey(now);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const groups: DayGroup[] = [];
  for (const [key, activities] of grouped) {
    if (!key.startsWith(monthPrefix)) continue;
    if (key < todayKey) continue;
    const [y, m, d] = key.split("-").map(Number);
    groups.push({ key, date: new Date(y, m - 1, d), activities });
  }
  groups.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return groups;
}
