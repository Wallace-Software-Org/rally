import { describe, it, expect, vi, beforeEach } from "vitest";

// Controllable supabase surface shared across the action/query under test.
// Hoisted so the vi.mock factories (which are hoisted too) can reference them.
const { mockGetUser, mockFrom, revalidatePath } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  RedirectType: { replace: "replace" },
}));

import { joinActivity, cancelActivity } from "@/lib/actions/activities";
import { getActivities } from "@/lib/queries/activities";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "host-1" } } });
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
