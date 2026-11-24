import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Keep inbound links, nested article URLs and query parameters intact.
    return [
      { source: '/our-approach/articles/:slug', destination: '/insights/articles/:slug', permanent: true },
      ...['philosophy', 'ai-architecture', 'salesforce'].map(category => ({ source: '/insights/'+category, destination: '/our-approach/'+category, permanent: true })),
    ];
  },
  cacheComponents: true,
  outputFileTracingIncludes: {
    "/api/scout": ["./src/lib/scout/skills/consultation-scheduling/SKILL.md"],
    "/opengraph-image": ["./public/brand/aa-monogram.svg"],
  },
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
