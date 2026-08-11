// Activity times in emails render in Phoenix time, matching the OG share card
// decision (src/lib/brand.ts SHARE_CARD): every recipient sees the same
// activity-local time regardless of their own timezone, and the server's
// timezone (UTC on Vercel) never leaks in. Multi-market tz support is backlogged.
const APP_TIME_ZONE = "America/Phoenix";

export function formatEmailDateTime(startsAt: string): string {
  const date = new Date(startsAt);
  const day = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  });
  return `${day} at ${time}`;
}
