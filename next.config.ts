import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  outputFileTracingIncludes: { "/api/scout": ["./src/lib/scout/skills/consultation-scheduling/SKILL.md"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        // Native CSS Modules must retain their scoped class-name exports.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
