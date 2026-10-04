import type { PublicRelease, Site } from "@black-throne/content/types";
import type { MerchItem } from "./merch/types";

const isoDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
};

const sameAs = (site: Site) => site.socials.filter((s) => !s.placeholder).map((s) => s.url);

export function musicGroup(site: Site, releases: PublicRelease[], origin: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: site.name,
    url: origin.href,
    description: site.description,
    genre: ["Metal"],
    sameAs: sameAs(site),
    album: releases
      .filter((r) => r.kind === "album")
      .map((r) => ({
        "@type": "MusicAlbum",
        name: r.title,
        url: new URL(`/chapters/${r.slug}`, origin).href,
      })),
  };
}

export function releaseLd(release: PublicRelease, site: Site, origin: URL) {
  const url = new URL(`/chapters/${release.slug}`, origin).href;
  const image = release.media.cover ? new URL(release.media.cover.og, origin).href : undefined;
  const byArtist = { "@type": "MusicGroup", name: site.name, url: origin.href };
  if (release.kind === "album") {
    return {
      "@context": "https://schema.org",
      "@type": "MusicAlbum",
      name: release.title,
      url,
      image,
      byArtist,
      datePublished: release.releaseDate,
      numTracks: release.tracks?.length,
      track: release.tracks?.map((t, i) => ({
        "@type": "MusicRecording",
        position: i + 1,
        name: t.title,
        duration: isoDuration(t.durationMs),
        url: `https://open.spotify.com/track/${t.uri.split(":")[2]}`,
      })),
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: release.title,
    url,
    image,
    byArtist,
    datePublished: release.releaseDate,
  };
}

/** A merch product page. Price and availability mirror what the page shows (USD). */
export function productLd(item: MerchItem, site: Site, origin: URL) {
  const url = new URL(`/merch/${item.slug}`, origin).href;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    url,
    image: item.images.slice(0, 4).map((i) => i.original),
    description: item.text.slice(0, 500) || undefined,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url,
      price: item.price.value.toFixed(2),
      priceCurrency: item.price.currency,
      availability: item.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

/** Serialises JSON-LD safely for a <script> tag. */
export function ldScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
