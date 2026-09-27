import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root holds the extension's lockfile; this template is its own root.
  outputFileTracingRoot: process.cwd(),
  // Type safety is enforced by the build's type step; the react-refresh
  // mixed-export rule doesn't fit context files that export constants +
  // components (the extension disables it the same way).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
