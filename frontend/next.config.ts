import type { NextConfig } from "next";

// Locally the repo root has a yarn.lock (Anchor workspace) next to this app's
// lockfile, which makes Next infer the wrong workspace root. Pin the bundler
// root to this app — but ONLY locally. On Vercel the Root Directory is already
// `frontend`, so overriding these paths misplaces the build output (.next).
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = isVercel
  ? {}
  : {
      turbopack: { root: process.cwd() },
      outputFileTracingRoot: process.cwd(),
    };

export default nextConfig;
