import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { BRAND_TEAL } from "@/lib/brand";

// Mirrors the globals.css tokens satori can't read as CSS vars.
const BG = "#E8DFD1"; // brand-bg
const RING = "#ECE5DA"; // brand-input
const TEXT = "#5A4A3A"; // brand-text
const MUTED = "#7A6854"; // brand-muted

export const alt = "Rally";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFonts() {
  const [semibold, regular] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/Geist-SemiBold.ttf")),
    readFile(join(process.cwd(), "public/fonts/Geist-Regular.ttf")),
  ]);
  return [
    { name: "Geist", data: semibold.buffer as ArrayBuffer, weight: 600 as const, style: "normal" as const },
    { name: "Geist", data: regular.buffer as ArrayBuffer, weight: 400 as const, style: "normal" as const },
  ];
}

export default async function Image() {
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BG,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {/* Mark: outer and centre bands share the brand teal, ring is the
              input token. Diameter is kept taller than the two text lines
              stacked beside it. */}
          <svg width={220} height={220} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill={BRAND_TEAL} />
            <circle cx="50" cy="50" r="38.5" fill={RING} />
            <circle cx="50" cy="50" r="27" fill={BRAND_TEAL} />
          </svg>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 108,
                fontWeight: 600,
                color: TEXT,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              Rally
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 36,
                fontWeight: 400,
                color: MUTED,
                lineHeight: 1.2,
              }}
            >
              Don&apos;t do your hobbies alone
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
