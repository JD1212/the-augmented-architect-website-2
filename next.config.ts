import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Keep inbound links, nested article URLs and query parameters intact.
    return [{ source: '/insights/:path*', destination: '/our-approach/:path*', permanent: true }];
  },
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
