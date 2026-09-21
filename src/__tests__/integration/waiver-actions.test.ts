import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockFrom, mockHeaders, insertWaiverAcceptance } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockHeaders: vi.fn(),
    insertWaiverAcceptance: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("next/headers", () => ({ headers: mockHeaders }));
// The service-role writer. waiver_acceptances grants no client role insert, so
// this is the only path that can write a row.
vi.mock("@/lib/queries/waivers", () => ({ insertWaiverAcceptance }));

import { acceptWaiver } from "@/lib/actions/waivers";
import { WAIVERS } from "@/lib/waivers";

function requestHeaders(values: Record<string, string>) {
  mockHeaders.mockResolvedValue(new Headers(values));
}

const upsert = insertWaiverAcceptance;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  insertWaiverAcceptance.mockResolvedValue({ error: null });
  requestHeaders({});
});

describe("acceptWaiver", () => {
  it("blocks unauthenticated callers before touching the table", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await acceptWaiver("participant", "WP");
    expect(res.error).toBe("Not authenticated");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown waiver type", async () => {
    const res = await acceptWaiver("admin", "WP");
    expect(res.error).toBe("Unknown waiver");
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([["", "empty"], ["   ", "blank"], ["a".repeat(11), "too long"]])(
    "rejects invalid initials (%j, %s)",
    async (initials) => {
      const res = await acceptWaiver("participant", initials);
      expect(res.error).toMatch(/initials/i);
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it("stores the current version and text from waivers.ts with trimmed initials", async () => {
    const res = await acceptWaiver("host", "  WP ");

    expect(res.error).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      user_id: "user-1",
      waiver_type: "host",
      version: WAIVERS.host.version,
      initials: "WP",
      waiver_text: WAIVERS.host.text,
      ip_address: null,
      user_agent: null,
    });
  });

  it("writes through the service-role client, never the user's client", async () => {
    await acceptWaiver("participant", "WP");
    expect(upsert).toHaveBeenCalledTimes(1);
    // The user's publishable-key client must not be used to write the row.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("takes user_id from the verified session, not from input", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "session-user" } } });
    // The action's signature has no user id, and extra arguments are ignored.
    await (acceptWaiver as (...args: unknown[]) => Promise<unknown>)(
      "participant",
      "WP",
      "attacker-id",
    );
    expect(upsert.mock.calls[0][0].user_id).toBe("session-user");
  });

  it("uses the version currently in waivers.ts, not a fixed one", async () => {
    const waiver = WAIVERS.participant;
    const original = waiver.version;
    try {
      waiver.version = 2;
      await acceptWaiver("participant", "WP");
      expect(upsert.mock.calls[0][0]).toMatchObject({
        version: 2,
        waiver_text: waiver.text,
      });
    } finally {
      waiver.version = original;
    }
  });

  it("records the first x-forwarded-for entry and the user agent", async () => {
    requestHeaders({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
      "user-agent": "Mozilla/5.0 (iPhone)",
    });
    await acceptWaiver("participant", "WP");
    expect(upsert.mock.calls[0][0]).toMatchObject({
      ip_address: "203.0.113.7",
      user_agent: "Mozilla/5.0 (iPhone)",
    });
  });

  it("leaves ip and user agent null when the headers are absent or blank", async () => {
    requestHeaders({ "x-forwarded-for": " ", "user-agent": "" });
    await acceptWaiver("participant", "WP");
    expect(upsert.mock.calls[0][0]).toMatchObject({
      ip_address: null,
      user_agent: null,
    });
  });

  it("caps audit header lengths", async () => {
    requestHeaders({
      "x-forwarded-for": "9".repeat(500),
      "user-agent": "u".repeat(5000),
    });
    await acceptWaiver("participant", "WP");
    const row = upsert.mock.calls[0][0];
    expect(row.ip_address).toHaveLength(64);
    expect(row.user_agent).toHaveLength(512);
  });

  it("returns a friendly error, not the database message, when the write fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { message: "permission denied" } });
    const res = await acceptWaiver("participant", "WP");
    expect(res.error).toBe("Could not record your agreement. Please try again.");
    log.mockRestore();
  });

  it("returns the same friendly error when the service-role client cannot be built", async () => {
    // getAdminClient throws when SUPABASE_SECRET_KEY is missing.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    upsert.mockRejectedValue(new Error("SUPABASE_SECRET_KEY is required"));
    const res = await acceptWaiver("participant", "WP");
    expect(res.error).toBe("Could not record your agreement. Please try again.");
    log.mockRestore();
  });
});
