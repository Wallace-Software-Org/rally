export type DateFilter = "all" | "today" | "this-week" | "this-weekend" | "next-week";

export const DATE_FILTER_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "Any time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This week", value: "this-week" },
  { label: "This weekend", value: "this-weekend" },
  { label: "Next week", value: "next-week" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Returns Monday 00:00:00 of the week containing d (ISO week: Mon–Sun)
function mondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export function matchesDateFilter(startsAt: string, filter: DateFilter): boolean {
  if (filter === "all") return true;

  const date = new Date(startsAt);
  const now = new Date();
  const mon = mondayOfWeek(now);

  if (filter === "today") {
    return date >= startOfDay(now) && date <= endOfDay(now);
  }

  if (filter === "this-week") {
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return date >= mon && date <= endOfDay(sun);
  }

  if (filter === "this-weekend") {
    const sat = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 5);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return date >= startOfDay(sat) && date <= endOfDay(sun);
  }

  if (filter === "next-week") {
    const nextMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
    const nextSun = new Date(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate() + 6);
    return date >= nextMon && date <= endOfDay(nextSun);
  }

  return true;
}
