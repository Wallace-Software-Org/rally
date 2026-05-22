import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  turbopack: {
    // Pin the project root so Turbopack doesn't get confused by lockfiles
    // elsewhere on the filesystem (e.g. a stray ~/package-lock.json)
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
