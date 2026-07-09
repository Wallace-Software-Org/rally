import { describe, it, expect, vi, beforeEach } from "vitest";

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

import {
  uploadAvatar,
  updateProfile,
  updateUserLocation,
} from "@/lib/actions/profiles";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

const asFile = (type: string, size: number) =>
  ({ type, size, name: `avatar.${type.split("/")[1]}` }) as unknown as File;

describe("uploadAvatar validation", () => {
  it("rejects a disallowed MIME type", async () => {
    const res = await uploadAvatar(asFile("image/gif", 1000));
    expect(res.error).toBe("Use a JPEG, PNG, or WebP image");
    expect(res.url).toBeNull();
  });

  it("rejects a file over 2MB", async () => {
    const res = await uploadAvatar(asFile("image/png", 3 * 1024 * 1024));
    expect(res.error).toBe("Image must be under 2MB");
  });

  it("blocks unauthenticated callers", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await uploadAvatar(asFile("image/png", 1000));
    expect(res.error).toBe("Not authenticated");
  });
});

describe("updateProfile validation", () => {
  const base = {
    full_name: "Wallace",
    username: "wallace",
    bio: "",
    instagram_handle: "",
    sports: ["running", "tennis"],
  };

  it("rejects sports not in the list without writing", async () => {
    const update = vi.fn();
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      update,
    });
    const res = await updateProfile({ ...base, sports: ["running", "quidditch"] });
    expect(res.error).toBe("Choose activities from the list");
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an over-long bio", async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      update: vi.fn(),
    });
    const res = await updateProfile({ ...base, bio: "x".repeat(301) });
    expect(res.error).toBe("Bio is too long");
  });
});

describe("updateUserLocation", () => {
  it("clamps coordinates to valid ranges before writing", async () => {
    const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
    mockFrom.mockReturnValue({ update });

    const res = await updateUserLocation(200, -500);
    expect(res.error).toBeNull();
    expect(update).toHaveBeenCalledWith({ lat: 90, lng: -180 });
  });

  it("rejects non-finite coordinates", async () => {
    const update = vi.fn();
    mockFrom.mockReturnValue({ update });
    const res = await updateUserLocation(NaN, 0);
    expect(res.error).toBe("Invalid coordinates");
    expect(update).not.toHaveBeenCalled();
  });
});
