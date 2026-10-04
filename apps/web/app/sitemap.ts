import { getReleases, getSite, type PublicRelease } from "@black-throne/content";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** When a release last changed in public. Never a future date: an announced release's date is its announcement. */
const changed = (r: PublicRelease) =>
  r.visibility === "released" ? (r.releaseDate ?? r.announceDate) : r.announceDate;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const url = (path: string) => new URL(path, origin).href;
  const releases = getReleases();
  // The site changes when a release does: the newest public release date stands in for the rest.
  const newest = releases
    .map(changed)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  return [
    { url: url("/"), lastModified: newest, changeFrequency: "weekly", priority: 1 },
    { url: url("/about"), lastModified: newest, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/links"), lastModified: newest, changeFrequency: "weekly", priority: 0.6 },
    // Product pages aren't listed: the build never calls Fourthwall (see lib/merch).
    ...(getSite().merch.enabled
      ? [{ url: url("/merch"), changeFrequency: "weekly" as const, priority: 0.5 }]
      : []),
    ...releases.map((r) => ({
      url: url(`/chapters/${r.slug}`),
      lastModified: changed(r),
      changeFrequency: "monthly" as const,
      priority: r.visibility === "announced" ? 0.9 : 0.8,
      images: r.media.cover ? [url(r.media.cover.src)] : undefined,
    })),
  ];
}
