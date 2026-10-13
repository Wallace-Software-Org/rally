import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Stubs the real Supabase SSR client so these tests exercise proxy.ts's own
// routing and cookie-forwarding logic (isPublic + the redirect decision +
// what rides along on each response) without a network call or a real
// session. getUser is a plain mock resolved per test. setAll is wired to the
// real adapter in proxy.ts (not mocked here) — these tests drive it by
// having getUser() itself call the cookies.setAll the client was constructed
// with, the same way the real Supabase client does when it refreshes a token.
const getUser = vi.fn();
let capturedSetAll:
  | ((
      cookies: { name: string; value: string; options?: Record<string, unknown> }[],
      headers: Record<string, string>,
    ) => void)
  | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: typeof capturedSetAll } },
  ) => {
    capturedSetAll = opts.cookies.setAll;
    return { auth: { getUser } };
  },
}));

async function run(path: string) {
  const { proxy } = await import("@/proxy");
  const request = new NextRequest(new URL(path, "https://rallytime.xyz"));
  return proxy(request);
}

beforeEach(() => {
  getUser.mockReset();
  capturedSetAll = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("proxy auth gate", () => {
  it("lets a signed-in user reach their own personal feed", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const response = await run("/feed/wallacepalmer");
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets a signed-in user reach someone else's personal feed", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const response = await run("/feed/someone-else");
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an anonymous request reach /feed/[username] (public read)", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await run("/feed/someone-else");
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects a signed-out visitor away from a non-public route", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await run("/profile/someone-else");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://rallytime.xyz/login");
  });

  it("lets a signed-in user reach a profile page (control case)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const response = await run("/profile/someone-else");
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("carries a session refresh's cookies onto the login redirect", async () => {
    // Simulates getUser() refreshing an expired access token (writing new
    // cookies via setAll) and still concluding there is no valid user for
    // this request — the exact sequence that silently dropped the refreshed
    // session before this fix, since the redirect branch built a brand new
    // response instead of returning the one setAll had written to.
    getUser.mockImplementation(async () => {
      capturedSetAll?.(
        [
          { name: "sb-access-token", value: "new-access-token", options: { path: "/" } },
          { name: "sb-refresh-token", value: "new-refresh-token", options: { path: "/" } },
        ],
        {},
      );
      return { data: { user: null } };
    });

    const response = await run("/profile/someone-else");

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-access-token")?.value).toBe("new-access-token");
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("new-refresh-token");
  });
});
