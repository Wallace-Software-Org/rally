import { describe, it, expect } from "vitest";
import { formatActivityTime } from "@/lib/utils/format-time";

describe("formatActivityTime", () => {
  // Relative dates keep these expectations valid no matter when tests run.
  it('returns "Today · ..." for a date that is today', () => {
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const result = formatActivityTime(today.toISOString());
    expect(result).toMatch(/^Today ·/);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a weekday label for tomorrow (not "Today")', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const result = formatActivityTime(tomorrow.toISOString());
    expect(result).not.toMatch(/^Today/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for a date 7 days out", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const result = formatActivityTime(future.toISOString());
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("·");
  });
});
