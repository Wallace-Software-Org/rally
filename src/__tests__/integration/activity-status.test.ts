import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Controllable supabase surface shared across the action/query under test.
// Hoisted so the vi.mock factories (which are hoisted too) can reference them.
const { mockGetUser, mockFrom, revalidatePath, redirect } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect,
  RedirectType: { replace: "replace" },
}));

import {
  joinActivity,
  cancelActivity,
  repeatActivity,
} from "@/lib/actions/activities";
import { getActivities } from "@/lib/queries/activities";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "host-1" } } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("joinActivity status guard", () => {
  it("blocks joining a cancelled activity and never inserts a participant", async () => {
    const insert = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === "activities") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { status: "cancelled" } }),
            }),
          }),
        };
      }
      return { insert };
    });

    const res = await joinActivity("a1");
    expect(res.error).toBe("This activity is no longer open");
    expect(insert).not.toHaveBeenCalled();
  });

  it("allows joining an open activity", async () => {
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "activities") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { status: "open" } }),
            }),
          }),
        };
      }
      return { insert };
    });

    const res = await joinActivity("a1");
    expect(res.error).toBeNull();
    expect(insert).toHaveBeenCalledWith({
      activity_id: "a1",
      user_id: "host-1",
      status: "joined",
    });
  });
});

describe("cancelActivity", () => {
  it("sets status to cancelled, keeps participants, and revalidates", async () => {
    const update = vi.fn(() => ({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
    const del = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === "activities") return { update };
      return { delete: del };
    });

    const res = await cancelActivity("a1");
    expect(res.error).toBeNull();
    expect(update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(del).not.toHaveBeenCalled(); // participants are preserved
    expect(revalidatePath).toHaveBeenCalled();
  });
});

describe("repeatActivity", () => {
  it("routes to the prefilled create form (next weekly occurrence) and inserts nothing", async () => {
    // Control "now" so the next-occurrence date is deterministic. Source is a
    // Wednesday 17:00; now is the Sunday before, so the next occurrence is the
    // following Wednesday.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const insert = vi.fn();
    const startsAt = "2026-07-01T17:00:00.000Z";
    mockFrom.mockImplementation((table: string) => {
      if (table === "activities") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      title: "Sunset run",
                      sport: "running",
                      description: "Easy pace",
                      external_link: null,
                      location_name: "Papago Park",
                      starts_at: startsAt,
                      visibility: "private",
                      max_participants: 8,
                      skill_level: "Beginner",
                      lat: 33.45,
                      lng: -111.95,
                    },
                  }),
              }),
            }),
          }),
          insert,
        };
      }
      return { insert };
    });

    await repeatActivity("src-1");

    expect(insert).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledTimes(1);
    const target = redirect.mock.calls[0][0] as string;
    expect(target.startsWith("/activity/new?")).toBe(true);

    const query = new URLSearchParams(target.split("?")[1]);
    expect(query.get("title")).toBe("Sunset run");
    expect(query.get("visibility")).toBe("private");
    // Next future Wednesday 17:00 after the controlled "now".
    expect(query.get("starts_at")).toBe("2026-07-08T17:00:00.000Z");
  });
});

describe("getActivities feed query", () => {
  it("filters the feed to open activities (excludes cancelled)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const eqCalls: unknown[][] = [];
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: () => q,
      eq: (...args: unknown[]) => {
        eqCalls.push(args);
        return q;
      },
      gt: () => q,
      order: () => Promise.resolve({ data: [] }),
    });
    mockFrom.mockReturnValue(q);

    const res = await getActivities();
    expect(res).toEqual([]);
    expect(eqCalls).toContainEqual(["status", "open"]);
  });
});
