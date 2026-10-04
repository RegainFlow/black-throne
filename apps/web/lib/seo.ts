import type { Metadata } from "next";
import { ogSize } from "./og";

export const SITE_NAME = "BLACK THRONE";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * The site-wide share card (app/opengraph-image.tsx). Set explicitly on every page: a page that
 * sets `openGraph` replaces its parent's, so a card inherited from a parent segment would be
 * dropped. Config images also beat a segment's own opengraph-image file, so segments that have
 * one (chapters) pass `ownImage` to leave it alone.
 */
const DEFAULT_IMAGE = {
  url: "/opengraph-image",
  ...ogSize,
  alt: `${SITE_NAME} — heavy sound. dark truth.`,
  type: "image/png",
};

/** A description cut to `max` characters on a word boundary (remote copy can run long). */
export function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

/**
 * A page's full metadata. Every page sets its own: Next merges metadata shallowly per key, so a
 * page without `alternates` or `openGraph` inherits a parent's canonical and og:url.
 *
 * `title` goes through the root template (" — BLACK THRONE") unless it is `{ absolute }`.
 * `og` adds type-specific Open Graph fields (e.g. `music.album`); it defaults to `website`.
 * `ownImage`: the segment has its own opengraph-image file, so no default card is set.
 * `keywords` replaces the site-wide list (metadata merges shallowly), so include the name.
 */
export function pageMeta({
  title,
  description,
  path,
  og,
  ownImage = false,
  keywords,
}: {
  title: string | { absolute: string };
  description: string;
  path: string;
  og?: OpenGraph;
  ownImage?: boolean;
  keywords?: string[];
}): Metadata {
  const shareTitle = typeof title === "string" ? `${title} — ${SITE_NAME}` : title.absolute;
  return {
    title,
    description,
    ...(keywords ? { keywords: [...new Set(keywords)] } : {}),
    alternates: { canonical: path },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      ...(ownImage ? {} : { images: [DEFAULT_IMAGE] }),
      ...og,
      title: shareTitle,
      description,
      url: path,
    },
    // No twitter.images: Next copies the page's resolved og:image (file-based ones included).
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}
