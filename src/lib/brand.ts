// Brand constants for JS consumers — places CSS/Tailwind tokens can't reach:
// inline-style values, third-party theme APIs, and server-side image generation
// (@vercel/og). CSS should use the @theme tokens in globals.css; these mirror
// the canonical values for code that needs literals.

// Canonical accent teal (mirrors --color-brand-teal).
export const BRAND_TEAL = "#4A9B8E";

// Cream text/fill on teal surfaces (mirrors --color-brand-warm-muted).
export const BRAND_CREAM = "#E8DCC8";

// How long a "Copied" confirmation stays before reverting, in ms.
export const COPY_FEEDBACK_MS = 2000;

// Share card (OG image) geometry and palette. @vercel/og renders server-side
// with inline styles, so these must be JS literals rather than CSS tokens.
export const SHARE_CARD = {
  width: 1080,
  height: 1920,
  bg: BRAND_TEAL,
  cream: BRAND_CREAM,
} as const;

// Mini-map animation values.
export const MAP_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;
export const MAP_FLY_MS = 600;
