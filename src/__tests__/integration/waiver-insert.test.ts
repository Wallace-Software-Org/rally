// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { upsert, from, createClient } = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  return { upsert, from, createClient: vi.fn(() => ({ from })) };
});
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const row = {
  user_id: "user-1",
  waiver_type: "participant",
  version: 1,
  initials: "WP",
  waiver_text: "text",
  ip_address: null,
  user_agent: null,
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  upsert.mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// Runs the real admin client against a mocked supabase-js, so this covers the
// whole insert path: secret-key client, then ON CONFLICT DO NOTHING.
describe("insertWaiverAcceptance", () => {
  it("inserts with the secret key, ON CONFLICT DO NOTHING on the unique key", async () => {
    const { insertWaiverAcceptance } = await import("@/lib/queries/waivers");

    const res = await insertWaiverAcceptance(row);

    expect(res.error).toBeNull();
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_secret_test",
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    );
    expect(from).toHaveBeenCalledWith("waiver_acceptances");
    expect(upsert).toHaveBeenCalledWith(row, {
      onConflict: "user_id,waiver_type,version",
      ignoreDuplicates: true,
    });
  });

  it("surfaces a database error to the caller", async () => {
    upsert.mockResolvedValue({ error: { message: "boom" } });
    const { insertWaiverAcceptance } = await import("@/lib/queries/waivers");
    const res = await insertWaiverAcceptance(row);
    expect(res.error).toEqual({ message: "boom" });
  });

  it("throws, rather than falling back to another key, when the secret key is missing", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const { insertWaiverAcceptance } = await import("@/lib/queries/waivers");
    await expect(insertWaiverAcceptance(row)).rejects.toThrow(/SUPABASE_SECRET_KEY/);
    expect(createClient).not.toHaveBeenCalled();
  });
});
