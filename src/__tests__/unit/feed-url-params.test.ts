import { describe, it, expect } from "vitest";
import {
  parseFeedParams,
  serializeFeedParams,
  slugifySport,
} from "@/lib/utils/feed-url-params";

const parse = (qs: string) => parseFeedParams(new URLSearchParams(qs));

describe("slugifySport", () => {
  it("lowercases and hyphenates multi-word names", () => {
    expect(slugifySport("Running")).toBe("running");
    expect(slugifySport("Table Tennis")).toBe("table-tennis");
    expect(slugifySport("  Pickleball  ")).toBe("pickleball");
  });
});

describe("parseFeedParams — view", () => {
  it("reads calendar", () => {
    expect(parse("view=calendar").view).toBe("calendar");
  });

  it("falls back to map for anything else or missing", () => {
    expect(parse("").view).toBe("map");
    expect(parse("view=map").view).toBe("map");
    expect(parse("view=bogus").view).toBe("map");
  });
});

describe("parseFeedParams — activities", () => {
  it("maps slugs to canonical display names", () => {
    expect(parse("activities=running,pickleball").sports).toEqual([
      "Running",
      "Pickleball",
    ]);
  });

  it("is case-insensitive", () => {
    expect(parse("activities=RUNNING,Pickleball").sports).toEqual([
      "Running",
      "Pickleball",
    ]);
  });

  it("silently drops unknown slugs", () => {
    expect(parse("activities=running,quidditch,tennis").sports).toEqual([
      "Running",
      "Tennis",
    ]);
  });

  it("collapses duplicates, preserving first-seen order", () => {
    expect(parse("activities=tennis,running,tennis").sports).toEqual([
      "Tennis",
      "Running",
    ]);
  });

  it("is empty when the param is absent or empty", () => {
    expect(parse("").sports).toEqual([]);
    expect(parse("activities=").sports).toEqual([]);
    expect(parse("activities=quidditch").sports).toEqual([]);
  });
});

describe("serializeFeedParams — default omission", () => {
  it("returns an empty string when everything is default", () => {
    expect(serializeFeedParams({ view: "map", sports: [] })).toBe("");
  });

  it("omits view for map and activities when empty", () => {
    expect(serializeFeedParams({ view: "map", sports: ["Running"] })).toBe(
      "?activities=running",
    );
    expect(serializeFeedParams({ view: "calendar", sports: [] })).toBe(
      "?view=calendar",
    );
  });

  it("writes both when both are non-default, comma stays literal", () => {
    expect(
      serializeFeedParams({ view: "calendar", sports: ["Running", "Pickleball"] }),
    ).toBe("?view=calendar&activities=running,pickleball");
  });
});

describe("round-tripping", () => {
  const cases: { view: "map" | "calendar"; sports: string[] }[] = [
    { view: "map", sports: [] },
    { view: "calendar", sports: [] },
    { view: "map", sports: ["Running"] },
    { view: "calendar", sports: ["Tennis", "Pickleball", "Other"] },
  ];

  for (const state of cases) {
    it(`parse(serialize(${JSON.stringify(state)})) is stable`, () => {
      const qs = serializeFeedParams(state);
      expect(parse(qs.replace(/^\?/, ""))).toEqual(state);
    });
  }
});
