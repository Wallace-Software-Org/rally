// Next future occurrence of the source's weekday at its original time of day.
// A fixed instant plus whole weeks preserves both weekday and time of day
// (Arizona has no DST), so we step forward one week at a time until the instant
// is in the future. Never returns a past instant: if today matches the weekday
// and the time is still ahead, today is returned; otherwise the next week is.
export function nextWeeklyOccurrence(
  startsAtIso: string,
  now: Date = new Date(),
): string {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  let t = new Date(startsAtIso).getTime();
  while (t <= nowMs) t += WEEK_MS;
  return new Date(t).toISOString();
}
