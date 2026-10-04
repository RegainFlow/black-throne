import { getReleases, getSite } from "@black-throne/content";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const url = (path: string) => new URL(path, origin).href;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/links"), changeFrequency: "weekly", priority: 0.6 },
    // Product pages aren't listed: the build never calls Fourthwall (see lib/merch).
    ...(getSite().merch.enabled
      ? [{ url: url("/merch"), changeFrequency: "weekly" as const, priority: 0.5 }]
      : []),
    ...getReleases().map((r) => ({
      url: url(`/chapters/${r.slug}`),
      changeFrequency: "monthly" as const,
      priority: r.visibility === "announced" ? 0.9 : 0.8,
    })),
  ];
}
