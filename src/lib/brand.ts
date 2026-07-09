// Brand constants for JS consumers — places CSS/Tailwind tokens can't reach:
// inline-style values, third-party theme APIs, and server-side image generation
// (@vercel/og). CSS should use the @theme tokens in globals.css; these mirror
// the canonical values for code that needs literals.

// Canonical accent teal (mirrors --color-brand-teal).
export const BRAND_TEAL = "#4A9B8E";

// How long a "Copied" confirmation stays before reverting, in ms.
export const COPY_FEEDBACK_MS = 2000;
