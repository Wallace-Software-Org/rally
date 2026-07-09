import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Controllable supabase surface shared across the action/query under test.
// Hoisted so the vi.mock factories (which are hoisted too) can reference them.
const { mockGetUser, mockFrom, mockRpc, revalidatePath, redirect } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect,
  RedirectType: { replace: "replace" },
}));

import {
  joinActivity,
  createActivity,
  updateActivity,
  cancelActivity,
  repeatActivity,
} from "@/lib/actions/activities";
import { getActivities } from "@/lib/queries/activities";

// A valid create/update payload; individual tests override one field to test a
// specific bound.
const futureIso = () => new Date(Date.now() + 3 * 24 * 3_600_000).toISOString();
function validActivity(over: Record<string, unknown> = {}) {
  return {
    sport: "running",
    title: "Morning run",
    description: "An easy pace along the canal, all levels welcome.",
    starts_at: futureIso(),
    ends_at: null,
    visibility: "public" as const,
    max_participants: 6,
    skill_level: "All levels",
    external_link: null,
    location_name: "Papago Park",
    lat: 33.45,
    lng: -111.95,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "host-1" } } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("joinActivity (atomic capacity RPC)", () => {
  it("delegates to the join_activity RPC and succeeds on 'ok'", async () => {
    mockRpc.mockResolvedValue({ data: "ok", error: null });
    const res = await joinActivity("a1");
    expect(mockRpc).toHaveBeenCalledWith("join_activity", {
      p_activity_id: "a1",
    });
    expect(res.error).toBeNull();
  });

  it("returns a full error when the activity is at capacity", async () => {
    mockRpc.mockResolvedValue({ data: "full", error: null });
    const res = await joinActivity("a1");
    expect(res.error).toBe("This activity is full");
  });

  it("returns a closed error when the activity is cancelled", async () => {
    mockRpc.mockResolvedValue({ data: "closed", error: null });
    const res = await joinActivity("a1");
    expect(res.error).toBe("This activity is no longer open");
  });

  it("blocks unauthenticated callers before hitting the RPC", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await joinActivity("a1");
    expect(res.error).toBe("Not authenticated");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("createActivity validation", () => {
  it("rejects a too-short description without inserting", async () => {
    const insert = vi.fn();
    mockFrom.mockReturnValue({ insert });
    const res = await createActivity(validActivity({ description: "too short" }));
    expect(res.error).toMatch(/at least 20 characters/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects max_participants above the bound", async () => {
    const insert = vi.fn();
    mockFrom.mockReturnValue({ insert });
    const res = await createActivity(validActivity({ max_participants: 25 }));
    expect(res.error).toMatch(/between 2 and 20/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a start time in the past", async () => {
    const insert = vi.fn();
    mockFrom.mockReturnValue({ insert });
    const res = await createActivity(
      validActivity({ starts_at: "2020-01-01T00:00:00.000Z" }),
    );
    expect(res.error).toMatch(/must be in the future/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range latitude", async () => {
    const insert = vi.fn();
    mockFrom.mockReturnValue({ insert });
    const res = await createActivity(validActivity({ lat: 200 }));
    expect(res.error).toBe("Invalid location");
    expect(insert).not.toHaveBeenCalled();
  });

  it("blocks unauthenticated callers", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await createActivity(validActivity());
    expect(res.error).toBe("Not authenticated");
  });
});

describe("updateActivity validation", () => {
  it("rejects an invalid sport", async () => {
    const update = vi.fn();
    mockFrom.mockReturnValue({ update });
    const res = await updateActivity("a1", validActivity({ sport: "quidditch" }));
    expect(res.error).toBe("Choose a valid sport");
    expect(update).not.toHaveBeenCalled();
  });

  it("allows a past start time on edit (requireFuture is false)", async () => {
    const update = vi.fn(() => ({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
    mockFrom.mockReturnValue({ update });
    const res = await updateActivity(
      "a1",
      validActivity({ starts_at: "2020-01-01T00:00:00.000Z" }),
    );
    expect(res.error).toBeNull();
    expect(update).toHaveBeenCalled();
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
