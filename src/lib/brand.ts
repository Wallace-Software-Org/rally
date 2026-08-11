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

// Email palette. Email clients strip CSS variables and Tailwind utilities, so
// transactional templates need literal hex, same rationale as SHARE_CARD. These
// mirror the globals.css @theme tokens; never inline hex in a template, import
// from here. border is the brand-border token (rgba over bg) flattened to a
// solid hex, since email borders need an opaque value.
export const EMAIL_PALETTE = {
  bg: "#E8DFD1", // brand-bg (email body)
  surface: "#DFD3C0", // brand-surface (card)
  teal: BRAND_TEAL, // brand-teal (button)
  cream: BRAND_CREAM, // brand-warm-muted (text on teal)
  text: "#5A4A3A", // brand-text
  muted: "#7A6854", // brand-muted (footer, secondary text)
  border: "#C5BAAB", // brand-border flattened over brand-bg
} as const;

// Mini-map animation values.
export const MAP_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;
export const MAP_FLY_MS = 600;
