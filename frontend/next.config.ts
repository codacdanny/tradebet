import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root has a yarn.lock (Anchor workspace) alongside this app's lockfile;
  // pin the bundler root to this app so module resolution is unambiguous.
  // npm scripts run from this directory, so cwd is the frontend root.
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
