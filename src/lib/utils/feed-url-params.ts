import { SPORTS_LIST } from "@/lib/utils/sport-config";

// The subset of feed state mirrored to the URL: the view toggle and the
// Activities multiselect. Nothing else (Time, Distance, Show, selected day,
// calendar month) is serialized.
export type FeedParams = {
  view: "map" | "calendar";
  // Canonical sport display names, exactly as held in the feed's `sports` state.
  sports: string[];
};

// Selectable sports (display names) minus the "All" sentinel.
const SPORT_ITEMS = SPORTS_LIST.filter((s) => s !== "All");

// URL-safe slug for a sport display name. Handles multi-word names
// ("Table Tennis" -> "table-tennis") rather than percent-encoding raw names.
export function slugifySport(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

const SLUG_TO_SPORT = new Map(SPORT_ITEMS.map((s) => [slugifySport(s), s]));

// URL params -> state. `view` falls back to map for anything but "calendar".
// `activities` is parsed case-insensitively; unknown slugs are dropped and
// duplicates collapsed, preserving first-seen order.
export function parseFeedParams(params: URLSearchParams): FeedParams {
  const view: FeedParams["view"] =
    params.get("view") === "calendar" ? "calendar" : "map";

  const raw = params.get("activities");
  const sports: string[] = [];
  const seen = new Set<string>();
  if (raw) {
    for (const token of raw.split(",")) {
      const sport = SLUG_TO_SPORT.get(slugifySport(token));
      if (sport && !seen.has(sport)) {
        seen.add(sport);
        sports.push(sport);
      }
    }
  }

  return { view, sports };
}

// State -> query string (including the leading "?"), or "" when everything is
// default. Only non-default values are written, so a bare feed stays bare.
// Built by hand so the comma between slugs stays literal (URLSearchParams would
// percent-encode it); slugs are [a-z-] only, so no other escaping is needed.
export function serializeFeedParams({ view, sports }: FeedParams): string {
  const parts: string[] = [];
  if (view === "calendar") parts.push("view=calendar");
  if (sports.length > 0) {
    parts.push(`activities=${sports.map(slugifySport).join(",")}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}
