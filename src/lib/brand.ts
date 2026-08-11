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
// from here. border is the brand-border token (a translucent rgba) flattened to
// a solid hex, since email borders need an opaque value.
export const EMAIL_PALETTE = {
  // Card surface: brand-input, the lightest palette value. The email has no
  // outer background, so the card sits on the client background: its border and
  // warm tint define it on a light client, and it reads as a light island on a
  // dark one.
  input: "#ECE5DA", // brand-input (card surface)
  teal: BRAND_TEAL, // brand-teal (brand dot + button)
  text: "#5A4A3A", // brand-text
  muted: "#7A6854", // brand-muted (footer, secondary text)
  border: "#C5BAAB", // brand-border as an opaque hex
  // White button label on brand-teal is ~3.3:1, clearing the WCAG 3:1 threshold
  // for large text (the label is bold) and beating the old cream-on-teal
  // (~2.4:1), while keeping brand teal consistent with the rest of the product.
  buttonText: "#FFFFFF",
} as const;

// Mini-map animation values.
export const MAP_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;
export const MAP_FLY_MS = 600;
