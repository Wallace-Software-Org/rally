import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockExchangeCode, mockGetUser, mockMaybeSingle, mockInsert } = vi.hoisted(
  () => ({
    mockExchangeCode: vi.fn(),
    mockGetUser: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockInsert: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      insert: mockInsert,
    })),
  })),
}));

import { GET } from "@/app/auth/callback/route";

function requestFor(params: Record<string, string>): NextRequest {
  const url = new URL("https://rallytime.xyz/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString() } as unknown as NextRequest;
}

function locationOf(response: Response): string | null {
  return response.headers.get("location");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExchangeCode.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  // Existing profile by default: most tests here are about a returning user.
  mockMaybeSingle.mockResolvedValue({ data: { id: "user-1" } });
});

describe("auth callback return path", () => {
  it("returns an existing, signed-in user to a plain activity return (the private gate), not the feed", async () => {
    const res = await GET(requestFor({ code: "abc", next: "/activity/act-1" }));
    expect(locationOf(res)).toBe("https://rallytime.xyz/activity/act-1");
  });

  it("still returns to the activity and opens the join modal when join=true (quick-join, unaffected by the fix)", async () => {
    const res = await GET(
      requestFor({ code: "abc", next: "/activity/act-1", join: "true" }),
    );
    expect(locationOf(res)).toBe("https://rallytime.xyz/activity/act-1?join=true");
  });

  it("falls back to the feed when there is no return path", async () => {
    const res = await GET(requestFor({ code: "abc" }));
    expect(locationOf(res)).toBe("https://rallytime.xyz/");
  });

  it("ignores a next outside /activity, so it cannot be used as an open redirect", async () => {
    const res = await GET(
      requestFor({ code: "abc", next: "https://evil.example.com" }),
    );
    expect(locationOf(res)).toBe("https://rallytime.xyz/");
  });

  it("sends a brand new user (no profile yet) to onboarding even with a plain activity return", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    const res = await GET(requestFor({ code: "abc", next: "/activity/act-1" }));
    expect(locationOf(res)).toBe("https://rallytime.xyz/onboarding");
  });

  it("still fast-tracks a brand new user straight to the activity via quick-join (unaffected by the fix)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: null });
    const res = await GET(
      requestFor({ code: "abc", next: "/activity/act-1", join: "true" }),
    );
    expect(locationOf(res)).toBe("https://rallytime.xyz/activity/act-1?join=true");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("sends back to login with an error flag when the code exchange fails", async () => {
    mockExchangeCode.mockResolvedValue({ error: { message: "bad code" } });
    const res = await GET(requestFor({ code: "abc", next: "/activity/act-1" }));
    expect(locationOf(res)).toBe("https://rallytime.xyz/login?error=auth");
  });
});
