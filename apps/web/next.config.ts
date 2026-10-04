import { existsSync } from "node:fs";
import { join } from "node:path";
import { releases, site } from "@black-throne/content/data";
import { findPlaceholders } from "@black-throne/content/validate";
import type { NextConfig } from "next";

// Local env files live at the repo root, next to .env.example, but Next only reads apps/web/.env*.
// Load the root ones too, in Next's precedence order. Values that are already set (the real
// environment, apps/web/.env*, Playwright's test env) always win: loadEnvFile never overrides.
const mode = process.env.NODE_ENV === "production" ? "production" : "development";
for (const file of [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"]) {
  const path = join(process.cwd(), "..", "..", file);
  if (existsSync(path)) process.loadEnvFile(path);
}

// Loud reminder in production builds while content still has placeholders.
if (process.env.NODE_ENV === "production") {
  const todo = findPlaceholders({ site, releases });
  if (
    site.merch.enabled &&
    (!process.env.FOURTHWALL_STOREFRONT_TOKEN || !process.env.NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN)
  ) {
    todo.push(
      "merch: FOURTHWALL_STOREFRONT_TOKEN / NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN unset (/merch shows 'opening soon')",
    );
  }
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
