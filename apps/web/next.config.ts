import { releases, site } from "@black-throne/content/data";
import { findPlaceholders } from "@black-throne/content/validate";
import type { NextConfig } from "next";

// Loud reminder in production builds while content still has placeholders.
if (process.env.NODE_ENV === "production") {
  const todo = findPlaceholders({ site, releases });
  if (todo.length) {
    console.warn(`\n⚠  Black Throne content placeholders:\n   - ${todo.join("\n   - ")}\n`);
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@black-throne/content"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
