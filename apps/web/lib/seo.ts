import type { Metadata } from "next";

export const SITE_NAME = "BLACK THRONE";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * A page's full metadata. Every page sets its own: Next merges metadata shallowly per key, so a
 * page without `alternates` or `openGraph` inherits a parent's canonical and og:url.
 *
 * `title` goes through the root template (" — BLACK THRONE") unless it is `{ absolute }`.
 * `og` adds type-specific Open Graph fields (e.g. `music.album`); it defaults to `website`.
 */
export function pageMeta({
  title,
  description,
  path,
  og,
}: {
  title: string | { absolute: string };
  description: string;
  path: string;
  og?: OpenGraph;
}): Metadata {
  const shareTitle = typeof title === "string" ? `${title} — ${SITE_NAME}` : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      ...og,
      title: shareTitle,
      description,
      url: path,
    },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}
