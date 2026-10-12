import type { MetadataRoute } from "next";
import { BRAND_TEAL } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rally",
    short_name: "Rally",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: BRAND_TEAL,
    background_color: "#E8DFD1", // brand-bg (mirrors --color-brand-bg)
    display: "standalone",
  };
}
