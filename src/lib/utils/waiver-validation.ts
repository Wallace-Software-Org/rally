export const WAIVER_INITIALS_MAX = 10;

// Signed initials are trimmed, 1 to 10 characters, and not blank. They are
// deliberately not compared against the user's name. Returns the value to store,
// or null when invalid. Shared by acceptWaiver (server) and the waiver modals
// (to enable the confirm button), so the two can never disagree.
export function normalizeInitials(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > WAIVER_INITIALS_MAX) return null;
  return trimmed;
}
