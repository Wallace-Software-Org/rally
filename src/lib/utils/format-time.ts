export function formatActivityTime(startsAt: string): string {
  const d = new Date(startsAt);
  const isToday = d.toDateString() === new Date().toDateString();
  const t = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()
    .replace(" ", ""); // collapse "7:00 am" → "7:00am"
  const day = isToday
    ? "Today"
    : d.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} · ${t}`;
}
