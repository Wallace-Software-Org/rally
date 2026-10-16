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
// after() schedules the email side effects; no-op it here so these action tests
// stay focused on the return contract and never run the email orchestration.
vi.mock("next/server", () => ({ after: vi.fn() }));

import {
  joinActivity,
  leaveActivity,
  createActivity,
  updateActivity,
  cancelActivity,
  repeatActivity,
} from "@/lib/actions/activities";
import { getActivities, getActivityById } from "@/lib/queries/activities";
import { WAIVERS } from "@/lib/waivers";
import { fakeWaiverTable, type FakeWaiverRow } from "@/test/fake-waiver-table";

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

// Serves waiver_acceptances from a fake table holding the given acceptances (all
// at version 1, for the signed-in user). Returns the table so a test can inspect
// which waiver types were queried.
function withAcceptedWaivers(...types: ("participant" | "host")[]) {
  const rows: FakeWaiverRow[] = types.map((waiver_type) => ({
    user_id: "host-1",
    waiver_type,
    version: 1,
  }));
  const waivers = fakeWaiverTable(rows);
  mockFrom.mockImplementation((table: string) => {
    if (table === "waiver_acceptances") return waivers.query();
    throw new Error(`unexpected table ${table}`);
  });
  return waivers;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "host-1" } } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("joinActivity (atomic capacity RPC)", () => {
  beforeEach(() => {
    withAcceptedWaivers("participant");
  });

  it("delegates to the join_activity RPC and succeeds on 'ok'", async () => {
    mockRpc.mockResolvedValue({ data: "ok", error: null });
    const res = await joinActivity("a1");
    expect(mockRpc).toHaveBeenCalledWith("join_activity", {
      p_activity_id: "a1",
    });
    expect(res.ok).toBe(true);
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

// The client router cache (and back/forward, which reuses cached pages) would
// replay a pre-join page unless the action invalidates it.
describe("joinActivity and leaveActivity invalidate joined state", () => {
  const paths = () => revalidatePath.mock.calls.map((c) => c.join("|"));
  const expectedPaths = [
    "/",
    "/activity/a1",
    "/profile/[username]|page",
    "/feed/[username]|page",
  ];

  it("revalidates the detail page and every listing after a successful join", async () => {
    withAcceptedWaivers("participant");
    mockRpc.mockResolvedValue({ data: "ok", error: null });

    await joinActivity("a1");

    expect(paths()).toEqual(expect.arrayContaining(expectedPaths));
  });

  it.each([
    ["full", { data: "full", error: null }],
    ["closed", { data: "closed", error: null }],
    ["an rpc error", { data: null, error: { message: "boom" } }],
  ])("does not revalidate when the join fails (%s)", async (_label, rpc) => {
    withAcceptedWaivers("participant");
    mockRpc.mockResolvedValue(rpc);

    await joinActivity("a1");

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not revalidate when the waiver blocks the join", async () => {
    withAcceptedWaivers();
    await joinActivity("a1");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  function mockLeave(result: { data: unknown; error: unknown }) {
    const select = vi.fn(() => Promise.resolve(result));
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => ({ select }) }) }),
    });
  }

  it("revalidates the detail page and every listing after a successful leave", async () => {
    mockLeave({ data: [{ id: "row-1" }], error: null });

    const res = await leaveActivity("a1");

    expect(res.error).toBeNull();
    expect(paths()).toEqual(expect.arrayContaining(expectedPaths));
  });

  it("does not revalidate when the leave fails", async () => {
    mockLeave({ data: null, error: { message: "boom" } });

    const res = await leaveActivity("a1");

    expect(res.error).toBe("boom");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("joinActivity participant waiver gate", () => {
  it("blocks the join server-side when the waiver is not accepted", async () => {
    withAcceptedWaivers();
    const res = await joinActivity("a1");
    expect(res).toEqual({
      ok: false,
      error: "Waiver required",
      waiverRequired: true,
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not accept the host waiver in place of the participant waiver", async () => {
    withAcceptedWaivers("host");
    const res = await joinActivity("a1");
    expect(res.waiverRequired).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("joins once the participant waiver is accepted", async () => {
    withAcceptedWaivers("participant");
    mockRpc.mockResolvedValue({ data: "ok", error: null });
    const res = await joinActivity("a1");
    expect(res.waiverRequired).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("join_activity", {
      p_activity_id: "a1",
    });
  });

  it("requires re-acceptance when the current version is raised", async () => {
    const waiver = WAIVERS.participant;
    const original = waiver.version;
    try {
      withAcceptedWaivers("participant"); // accepted at version 1
      waiver.version = 2;
      const res = await joinActivity("a1");
      expect(res.waiverRequired).toBe(true);
      expect(mockRpc).not.toHaveBeenCalled();
    } finally {
      waiver.version = original;
    }
  });
});

describe("createActivity host waiver gate", () => {
  // Chains for the two writes createActivity makes on success.
  function mockCreateWrites() {
    const participantInsert = vi.fn(() => Promise.resolve({ error: null }));
    const activityInsert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "new-1" }, error: null }),
      }),
    }));
    return { participantInsert, activityInsert };
  }

  function serveTables(
    waivers: ReturnType<typeof fakeWaiverTable>,
    writes: ReturnType<typeof mockCreateWrites>,
  ) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "waiver_acceptances") return waivers.query();
      if (table === "activities") return { insert: writes.activityInsert };
      if (table === "participants") return { insert: writes.participantInsert };
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("blocks posting when the host waiver is not accepted", async () => {
    const writes = mockCreateWrites();
    serveTables(fakeWaiverTable([]), writes);

    const res = await createActivity(validActivity());

    expect(res).toEqual({ error: "Waiver required", waiverRequired: true });
    expect(writes.activityInsert).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not accept the participant waiver in place of the host waiver", async () => {
    const writes = mockCreateWrites();
    serveTables(
      fakeWaiverTable([
        { user_id: "host-1", waiver_type: "participant", version: 1 },
      ]),
      writes,
    );

    const res = await createActivity(validActivity());

    expect(res.waiverRequired).toBe(true);
    expect(writes.activityInsert).not.toHaveBeenCalled();
  });

  it("posts, and auto-joins the host without the participant waiver", async () => {
    // Only the HOST waiver is accepted. The host's own participants row must
    // still be inserted, and nothing may ask about the participant waiver.
    const writes = mockCreateWrites();
    const waivers = fakeWaiverTable([
      { user_id: "host-1", waiver_type: "host", version: 1 },
    ]);
    serveTables(waivers, writes);

    await createActivity(validActivity());

    expect(writes.activityInsert).toHaveBeenCalledTimes(1);
    expect(writes.participantInsert).toHaveBeenCalledWith({
      activity_id: "new-1",
      user_id: "host-1",
      status: "joined",
    });
    expect(waivers.eqCalls).toContainEqual(["waiver_type", "host"]);
    expect(waivers.eqCalls).not.toContainEqual(["waiver_type", "participant"]);
    expect(redirect).toHaveBeenCalledWith(
      "/activity/new-1?posted=true",
      "replace",
    );
  });

  it("requires re-acceptance when the current version is raised", async () => {
    const waiver = WAIVERS.host;
    const original = waiver.version;
    try {
      const writes = mockCreateWrites();
      serveTables(
        fakeWaiverTable([
          { user_id: "host-1", waiver_type: "host", version: 1 },
        ]),
        writes,
      );
      waiver.version = 2;

      const res = await createActivity(validActivity());

      expect(res.waiverRequired).toBe(true);
      expect(writes.activityInsert).not.toHaveBeenCalled();
    } finally {
      waiver.version = original;
    }
  });

  it("checks validation before the waiver, so a bad form never hits the waiver table", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("no table access expected");
    });
    const res = await createActivity(validActivity({ description: "short" }));
    expect(res.error).toMatch(/at least 20 characters/);
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
      eq: () => ({
        eq: () => ({
          neq: () => ({
            select: () =>
              Promise.resolve({ data: [{ id: "a1" }], error: null }),
          }),
        }),
      }),
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

// Regression coverage for the lost-code incident: getActivityById must call
// get_activity_for_viewer() via RPC, not a plain select against activities
// (the new policy blocks that for anyone but the creator/a participant).
// Exercises the real call shape through the mocked Supabase client — not a
// module-level mock of getActivityById itself, which would hide exactly this
// class of bug (the activity-page integration tests mock getActivityById
// entirely, which is why nothing caught the regression this follows from).
describe("getActivityById (RLS-era call shape)", () => {
  const coreRow = {
    id: "a1",
    title: "Sunset run",
    sport: "running",
    description: "Easy pace along the canal",
    external_link: null,
    location_name: "Papago Park",
    starts_at: "2026-08-01T17:00:00.000Z",
    max_participants: 8,
    skill_level: "Beginner",
    lat: 33.45,
    lng: -111.95,
    status: "open",
    creator_id: "host-1",
    visibility: "private",
  };

  const hostRow = {
    id: "host-1",
    full_name: "Casey Host",
    avatar_url: null,
    instagram_handle: null,
    username: "caseyhost",
  };

  // Wires mockRpc to return the core row (or none, for a 404) and mockFrom to
  // serve participants/profiles/activities the way getActivityById's three
  // follow-up queries expect, so the only thing that varies per test is the
  // participant rows participants itself hands back — the thing the
  // restrict_participants_visibility policy actually gates.
  function serve({
    rpcRows = [coreRow],
    participantRows = [] as { id: string; user_id: string; profiles: unknown }[],
    hostedCount = 1,
  } = {}) {
    mockRpc.mockResolvedValue({ data: rpcRows });
    mockFrom.mockImplementation((table: string) => {
      if (table === "participants") {
        return { select: () => ({ eq: () => Promise.resolve({ data: participantRows }) }) };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: hostRow }) }),
          }),
        };
      }
      if (table === "activities") {
        return { select: () => ({ eq: () => Promise.resolve({ count: hostedCount }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });
  }

  it("calls get_activity_for_viewer with the activity id, not a plain select", async () => {
    serve({ participantRows: [{ id: "p1", user_id: "host-1", profiles: hostRow }] });

    await getActivityById("a1", "host-1");

    expect(mockRpc).toHaveBeenCalledWith("get_activity_for_viewer", {
      p_activity_id: "a1",
    });
  });

  it("a participant sees their own private activity, not the private sentinel", async () => {
    serve({
      participantRows: [
        { id: "p1", user_id: "host-1", profiles: hostRow },
        { id: "p2", user_id: "viewer-1", profiles: null },
      ],
    });

    const result = await getActivityById("a1", "viewer-1");

    expect(result).not.toBe("private");
    expect(result).not.toBeNull();
    expect((result as { visibility: string }).visibility).toBe("private");
    expect((result as { participants: unknown[] }).participants).toHaveLength(2);
  });

  it("the creator sees their own private activity", async () => {
    serve({ participantRows: [{ id: "p1", user_id: "host-1", profiles: hostRow }] });

    const result = await getActivityById("a1", "host-1");

    expect(result).not.toBe("private");
    expect((result as { creator_id: string }).creator_id).toBe("host-1");
  });

  it("an anonymous requester still gets the private sentinel", async () => {
    serve({ participantRows: [{ id: "p1", user_id: "host-1", profiles: hostRow }] });

    const result = await getActivityById("a1", null);

    expect(result).toBe("private");
  });

  it("a non-existent activity resolves to null, not the private sentinel", async () => {
    serve({ rpcRows: [] });

    const result = await getActivityById("missing", "viewer-1");

    expect(result).toBeNull();
  });

  // Documents the known, not-yet-closed gap. get_activity_for_viewer() lets
  // an invite-link viewer who is neither creator nor participant resolve the
  // activity itself (the RPC is keyed on the id alone, no auth.uid() check).
  // participants has no equivalent: restrict_participants_visibility's
  // policy is creator/participant/public only, so on the real database this
  // viewer's plain participants select comes back empty even though real
  // participants exist — which is exactly the zero rows seeded below,
  // standing in for what the live policy actually returns to them. This test
  // pins today's actual (partially broken) behavior rather than the desired
  // one: it should start failing, in a good way, once a participants-side
  // equivalent of get_activity_for_viewer lands, at which point the seed and
  // assertion here should both flip to expect the full list.
  it("an invite-link viewer who has not joined sees the activity but an empty participant list (known gap)", async () => {
    serve({ participantRows: [] });

    const result = await getActivityById("a1", "uninvolved-viewer");

    // The activity itself resolves — this is what get_activity_for_viewer fixes.
    expect(result).not.toBe("private");
    expect(result).not.toBeNull();
    // The participant list does not: two real participants exist (host-1 and
    // others, per the other tests in this block), but this viewer's policy-
    // restricted read sees none of them.
    expect((result as { participants: unknown[] }).participants).toEqual([]);
  });
});
