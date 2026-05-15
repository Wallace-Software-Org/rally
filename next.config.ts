import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root so Turbopack doesn't get confused by lockfiles
    // elsewhere on the filesystem (e.g. a stray ~/package-lock.json)
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
