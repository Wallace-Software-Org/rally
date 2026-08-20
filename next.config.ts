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
  experimental: {
    // Client router cache lifetimes. Every page here renders dynamically (the
    // Supabase server client reads cookies), and the default dynamic staleTime
    // of 0 means each Link navigation refetches a page already visited, so
    // skeletons flash on the way back. Mutations still call revalidatePath, and
    // realtime corrects counts and avatars after paint, so a briefly stale card
    // heals itself.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
