import type { Visibility } from "@/types";

// Bridge between the DB's plain `visibility` string and the domain union.
// visibility (like status) is intentionally stored as text + a check constraint
// rather than a Postgres enum: enums are painful to alter later, and the check
// constraint fully covers the invariant. Because of that, generated Supabase
// types surface visibility as a plain string, so this helper narrows it to the
// domain union at the query boundary. The check constraint guarantees the value
// is one of the two, so anything unexpected falls back to the safe "public".
export function toVisibility(value: string): Visibility {
  return value === "private" ? "private" : "public";
}
