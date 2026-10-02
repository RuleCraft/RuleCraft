import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next writes agent instruction files at the repo root unless this is off.
  // The public repository carries no Markdown but its README.
  agentRules: false,
  // A second build for local anvil testing can live next to the real one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
