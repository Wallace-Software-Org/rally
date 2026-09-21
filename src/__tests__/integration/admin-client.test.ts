// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ from: vi.fn(), rpc: vi.fn() })),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getAdminClient", () => {
  it("builds a service-role client from the secret key, with no session persistence", async () => {
    const { getAdminClient } = await import("@/lib/supabase/admin");

    getAdminClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_secret_test",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  });

  it("reuses one client across calls", async () => {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    expect(getAdminClient()).toBe(getAdminClient());
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["SUPABASE_SECRET_KEY"],
    ["NEXT_PUBLIC_SUPABASE_URL"],
  ])("throws when %s is missing", async (name) => {
    vi.stubEnv(name, "");
    const { getAdminClient } = await import("@/lib/supabase/admin");
    expect(() => getAdminClient()).toThrow(/SUPABASE_SECRET_KEY/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("refuses to run in a browser context", async () => {
    vi.stubGlobal("window", {});
    const { getAdminClient } = await import("@/lib/supabase/admin");
    expect(() => getAdminClient()).toThrow(/browser context/);
    expect(createClient).not.toHaveBeenCalled();
  });
});
