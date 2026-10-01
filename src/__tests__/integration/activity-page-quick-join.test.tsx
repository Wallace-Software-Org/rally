import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, getActivityById } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  getActivityById: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));
vi.mock("@/lib/queries/activities", () => ({ getActivityById }));
vi.mock("@/lib/queries/profiles", () => ({
  getProfileById: vi.fn(async () => ({
    id: "viewer-1",
    username: "viewer",
    full_name: "Viewer",
    avatar_url: null,
    instagram_handle: null,
    sports: [],
  })),
}));
vi.mock("@/lib/queries/waivers", () => ({
  hasAcceptedWaiver: vi.fn(async () => true),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

import ActivityPage from "@/app/(app)/activity/[id]/page";

const activity = (participantIds: string[]) => ({
  id: "act-1",
  creator_id: "host-1",
  participants: participantIds.map((user_id) => ({
    id: `p-${user_id}`,
    user_id,
    profiles: null,
  })),
});

async function autoOpenJoinFor(
  viewer: string | null,
  participantIds: string[],
  query: Record<string, string> = { join: "true" },
) {
  mockGetUser.mockResolvedValue({
    data: { user: viewer ? { id: viewer } : null },
  });
  getActivityById.mockResolvedValue(activity(participantIds));
  const element = await ActivityPage({
    params: Promise.resolve({ id: "act-1" }),
    searchParams: Promise.resolve(query),
  });
  return (element as { props: { autoOpenJoin: boolean } }).props.autoOpenJoin;
}

beforeEach(() => vi.clearAllMocks());

describe("activity page quick join (?join=true)", () => {
  it("asks the view to open the join modal for a viewer who is not going", async () => {
    expect(await autoOpenJoinFor("viewer-1", ["host-1"])).toBe(true);
  });

  it("does not open it for an existing participant (stale ?join=true in history)", async () => {
    expect(await autoOpenJoinFor("viewer-1", ["host-1", "viewer-1"])).toBe(false);
  });

  it("does not open it for the host", async () => {
    expect(await autoOpenJoinFor("host-1", ["host-1"])).toBe(false);
  });

  it("does not open it without the param", async () => {
    expect(await autoOpenJoinFor("viewer-1", ["host-1"], {})).toBe(false);
  });

  it("does not open it for a signed-out visitor", async () => {
    expect(await autoOpenJoinFor(null, ["host-1"])).toBe(false);
  });
});
