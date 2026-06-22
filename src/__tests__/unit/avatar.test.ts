import { describe, expect, it } from "vitest";
import {
  getInitials,
  shouldBlurAvatarForViewer,
} from "@/lib/utils/avatar";

describe("avatar utilities", () => {
  it("gets initials from a display name", () => {
    expect(getInitials("Jake Kline")).toBe("JK");
    expect(getInitials("  Pat   Avery  ")).toBe("PA");
    expect(getInitials(null)).toBe("?");
  });

  it("only blurs non-host avatars for logged-out viewers", () => {
    expect(shouldBlurAvatarForViewer(null, false)).toBe(true);
    expect(shouldBlurAvatarForViewer(null, true)).toBe(false);
    expect(shouldBlurAvatarForViewer("user-1", false)).toBe(false);
  });
});
