import type { PublicRelease, Site } from "@black-throne/content/types";
import type { MerchItem } from "./merch/types";

const isoDuration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `PT${Math.floor(s / 60)}M${s % 60}S`;
};

/** Stable node ids, so every page describes the same artist entity. */
export const artistId = (origin: URL) => new URL("/#artist", origin).href;
const websiteId = (origin: URL) => new URL("/#website", origin).href;
const releaseUrl = (slug: string, origin: URL) => new URL(`/chapters/${slug}`, origin).href;
const releaseId = (slug: string, origin: URL) => `${releaseUrl(slug, origin)}#release`;
const releaseType = (r: PublicRelease) =>
  r.kind === "album" ? "https://schema.org/AlbumRelease" : "https://schema.org/SingleRelease";

/** Every official profile, for `sameAs`. Placeholder socials never count. */
export function officialProfiles(site: Site): string[] {
  return [
    ...site.socials.filter((s) => !s.placeholder).map((s) => s.url),
    ...site.profiles.map((p) => p.url),
  ];
}

export function musicGroup(site: Site, releases: PublicRelease[], origin: URL) {
  const { profile } = site;
  const logo = new URL("/icon.png", origin).href;
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "@id": artistId(origin),
    name: site.name,
    alternateName: profile.alternateNames.length ? profile.alternateNames : undefined,
    url: origin.href,
    description: site.description,
    image: logo,
    logo,
    genre: profile.genres,
    // Artist-supplied facts only: each is left out until it is set in site.ts.
    foundingDate: profile.formed,
    foundingLocation: profile.origin ? { "@type": "Place", name: profile.origin } : undefined,
    member: profile.members?.map((m) =>
      m.role
        ? {
            "@type": "OrganizationRole",
            roleName: m.role,
            member: { "@type": "Person", name: m.name },
          }
        : { "@type": "Person", name: m.name },
    ),
    sameAs: officialProfiles(site),
    album: releases.map((r) => ({
      "@type": "MusicAlbum",
      "@id": releaseId(r.slug, origin),
      name: r.title,
      url: releaseUrl(r.slug, origin),
      albumReleaseType: releaseType(r),
    })),
  };
}

/** The site itself: gives Google the site name to show, and ties the site to the artist. */
export function websiteLd(site: Site, origin: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(origin),
    name: site.name,
    alternateName: site.profile.alternateNames.length ? site.profile.alternateNames : undefined,
    url: origin.href,
    inLanguage: "en",
    publisher: { "@id": artistId(origin) },
  };
}

/** Singles are albums too (`SingleRelease`), the way Spotify and MusicBrainz model them. */
export function releaseLd(release: PublicRelease, site: Site, origin: URL) {
  const url = releaseUrl(release.slug, origin);
  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "@id": releaseId(release.slug, origin),
    name: release.title,
    url,
    image: release.media.cover ? new URL(release.media.cover.og, origin).href : undefined,
    albumReleaseType: releaseType(release),
    byArtist: { "@type": "MusicGroup", "@id": artistId(origin), name: site.name, url: origin.href },
    genre: site.profile.genres,
    datePublished: release.releaseDate,
    sameAs: release.spotify ? [release.spotify.url] : undefined,
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

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
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
