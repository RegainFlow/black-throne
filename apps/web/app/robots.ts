import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * Every crawler is welcome, AI crawlers included (search, answer and training bots alike: the
 * artist's call, 2026-10-04). One `*` group on purpose: a bot with its own group ignores `*`, so
 * per-bot groups would each have to repeat the disallow list.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/merch/cart"] },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
