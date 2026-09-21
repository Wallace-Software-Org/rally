import { describe, it, expect } from "vitest";
import {
  isWaiverType,
  WAIVER_TYPES,
  WAIVERS,
  type WaiverType,
} from "@/lib/waivers";
import {
  normalizeInitials,
  WAIVER_INITIALS_MAX,
} from "@/lib/utils/waiver-validation";
import { hasAcceptedWaiver } from "@/lib/queries/waivers";
import { fakeWaiverTable } from "@/test/fake-waiver-table";

describe("waiver content", () => {
  it("defines both waivers at version 1 with the fields the UI needs", () => {
    expect([...WAIVER_TYPES].sort()).toEqual(["host", "participant"]);
    for (const type of WAIVER_TYPES) {
      const waiver = WAIVERS[type];
      expect(waiver.version).toBe(1);
      expect(waiver.title.length).toBeGreaterThan(0);
      expect(waiver.text.length).toBeGreaterThan(0);
      expect(waiver.checkboxLabel.length).toBeGreaterThan(0);
    }
  });

  it("uses the agreed titles and checkbox labels", () => {
    expect(WAIVERS.participant.title).toBe(
      "Assumption of Risk and Release of Liability",
    );
    expect(WAIVERS.participant.checkboxLabel).toBe(
      "I accept the risks and release Rally and hosts from liability.",
    );
    expect(WAIVERS.host.title).toBe("Host Agreement");
    expect(WAIVERS.host.checkboxLabel).toBe("I understand and agree.");
  });

  it("numbers every clause, six for participants and four for hosts", () => {
    const clauses = (type: WaiverType) => WAIVERS[type].text.split("\n\n");
    expect(clauses("participant")).toHaveLength(6);
    expect(clauses("host")).toHaveLength(4);
    for (const type of WAIVER_TYPES) {
      clauses(type).forEach((clause, i) =>
        expect(clause.startsWith(`${i + 1}. `)).toBe(true),
      );
    }
  });

  it("follows the copy rules: no em dashes, no double dashes", () => {
    for (const type of WAIVER_TYPES) {
      const { title, text, checkboxLabel } = WAIVERS[type];
      for (const copy of [title, text, checkboxLabel]) {
        expect(copy).not.toContain("—");
        expect(copy).not.toContain("--");
      }
    }
  });

  it("names Rally as the party, not an LLC", () => {
    expect(WAIVERS.participant.text).toContain("Rally");
    expect(WAIVERS.host.text).toContain("Rally");
    expect(WAIVERS.participant.text).not.toMatch(/LLC/i);
    expect(WAIVERS.host.text).not.toMatch(/LLC/i);
  });

  it("recognizes only the two waiver types", () => {
    expect(isWaiverType("participant")).toBe(true);
    expect(isWaiverType("host")).toBe(true);
    expect(isWaiverType("admin")).toBe(false);
    expect(isWaiverType("")).toBe(false);
    expect(isWaiverType(undefined)).toBe(false);
    expect(isWaiverType({ toString: () => "host" })).toBe(false);
  });
});

describe("initials validation", () => {
  it("accepts 1 to 10 characters and returns the trimmed value", () => {
    expect(normalizeInitials("W")).toBe("W");
    expect(normalizeInitials("WP")).toBe("WP");
    expect(normalizeInitials("  WP  ")).toBe("WP");
    expect(normalizeInitials("a".repeat(WAIVER_INITIALS_MAX))).toBe(
      "a".repeat(WAIVER_INITIALS_MAX),
    );
  });

  it("rejects empty and blank input", () => {
    expect(normalizeInitials("")).toBeNull();
    expect(normalizeInitials("   ")).toBeNull();
    expect(normalizeInitials("\t\n")).toBeNull();
  });

  it("rejects more than 10 characters, measured after trimming", () => {
    expect(normalizeInitials("a".repeat(WAIVER_INITIALS_MAX + 1))).toBeNull();
    expect(normalizeInitials(`  ${"a".repeat(WAIVER_INITIALS_MAX)}  `)).toBe(
      "a".repeat(WAIVER_INITIALS_MAX),
    );
  });

  it("rejects non-strings from an untrusted caller", () => {
    expect(normalizeInitials(undefined)).toBeNull();
    expect(normalizeInitials(null)).toBeNull();
    expect(normalizeInitials(42)).toBeNull();
    expect(normalizeInitials(["WP"])).toBeNull();
  });

  it("does not compare against the user's name", () => {
    // Any non-blank string passes, whether or not it looks like the user's name.
    expect(normalizeInitials("ZZ")).toBe("ZZ");
    expect(normalizeInitials("Not Me")).toBe("Not Me");
  });
});

describe("hasAcceptedWaiver", () => {
  // The fake applies the same eq/eq/gte filters the query builds, so these
  // exercise the real query against rows rather than a canned answer.
  const client = (rows: Parameters<typeof fakeWaiverTable>[0]) =>
    ({ from: () => fakeWaiverTable(rows).query() }) as never;

  it("is true when the current version was accepted", async () => {
    const supabase = client([
      { user_id: "u1", waiver_type: "participant", version: 1 },
    ]);
    expect(await hasAcceptedWaiver(supabase, "u1", "participant")).toBe(true);
  });

  it("is false with no acceptance, another user's, or another type's", async () => {
    expect(await hasAcceptedWaiver(client([]), "u1", "participant")).toBe(false);
    expect(
      await hasAcceptedWaiver(
        client([{ user_id: "u2", waiver_type: "participant", version: 1 }]),
        "u1",
        "participant",
      ),
    ).toBe(false);
    expect(
      await hasAcceptedWaiver(
        client([{ user_id: "u1", waiver_type: "host", version: 1 }]),
        "u1",
        "participant",
      ),
    ).toBe(false);
  });

  it("counts a newer acceptance (version >= current) as accepted", async () => {
    const supabase = client([
      { user_id: "u1", waiver_type: "host", version: 3 },
    ]);
    expect(await hasAcceptedWaiver(supabase, "u1", "host")).toBe(true);
  });

  it("forces re-acceptance when the current version is raised", async () => {
    const waiver = WAIVERS.participant;
    const original = waiver.version;
    const supabase = client([
      { user_id: "u1", waiver_type: "participant", version: original },
    ]);
    try {
      expect(await hasAcceptedWaiver(supabase, "u1", "participant")).toBe(true);
      waiver.version = original + 1;
      expect(await hasAcceptedWaiver(supabase, "u1", "participant")).toBe(false);
    } finally {
      waiver.version = original;
    }
  });

  it("fails closed when the query errors", async () => {
    const failing = {
      from: () => {
        const q = {
          select: () => q,
          eq: () => q,
          gte: () => q,
          limit: () => q,
          then: (resolve: (r: unknown) => unknown) =>
            resolve({ data: null, error: { message: "boom" } }),
        };
        return q;
      },
    } as never;
    expect(await hasAcceptedWaiver(failing, "u1", "participant")).toBe(false);
  });
});
