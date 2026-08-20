import { describe, it, expect } from "vitest";
import { fitWithin } from "@/lib/utils/image-resize";

// Only the sizing arithmetic is covered here. Decoding and encoding are canvas
// APIs with no jsdom implementation, so those paths need a real browser.
describe("fitWithin", () => {
  it("scales a landscape phone photo to a 512px long edge", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 512, height: 384 });
  });

  it("scales a portrait phone photo to a 512px long edge", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 384, height: 512 });
  });

  it("preserves the aspect ratio of an extreme panorama", () => {
    const { width, height } = fitWithin(8000, 1000);
    expect(width).toBe(512);
    expect(height).toBe(64);
  });

  it("leaves an image already within the limit untouched", () => {
    expect(fitWithin(400, 300)).toEqual({ width: 400, height: 300 });
    expect(fitWithin(512, 512)).toEqual({ width: 512, height: 512 });
  });

  it("never upscales", () => {
    const { width, height } = fitWithin(96, 96);
    expect(width).toBe(96);
    expect(height).toBe(96);
  });

  it("never rounds a thin edge down to zero", () => {
    expect(fitWithin(10000, 5).height).toBe(1);
  });

  it("accepts a custom max edge", () => {
    expect(fitWithin(2000, 1000, 100)).toEqual({ width: 100, height: 50 });
  });
});
