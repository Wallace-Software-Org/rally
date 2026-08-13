import { BRAND_TEAL } from "@/lib/brand";

export const MAP_STYLE = "mapbox://styles/mapbox/navigation-night-v1";
export const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
export const PIN_SIZE_DEFAULT = 14;
export const PIN_SIZE_SELECTED = 18;
export const PIN_COLOR = BRAND_TEAL;
// Calendar view: pins for days other than the selected one are de-emphasized —
// smaller and a desaturated (not gray) teal, so they read as background context
// rather than disabled. brand-teal-muted is the palette's desaturated teal.
export const PIN_SIZE_OTHER = 11;
export const PIN_COLOR_MUTED = "var(--color-brand-teal-muted)";
// Dark canvas shown behind the mini-map while Mapbox tiles load.
export const MAP_LOADING_BG = "#0d1b2a";
