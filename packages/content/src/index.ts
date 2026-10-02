import "server-only";
import { eras, releases, site, slots } from "./data";
import manifest from "./generated/media-manifest.json" with { type: "json" };
import type {
  Chapter,
  ChapterItem,
  Era,
  EraId,
  MediaManifest,
  PublicRelease,
  PublicSlot,
  SealedSlot,
  Site,
} from "./types";
import { validateContent } from "./validate";

validateContent({ site, eras, releases, slots });

const media = manifest as MediaManifest;

function withMedia(slug: string): PublicRelease {
  const release = releases.find((r) => r.slug === slug);
  if (!release) throw new Error(`Unknown release: ${slug}`);
  return { ...release, media: media.releases?.[slug] ?? {} };
}

export function getSite(): Site {
  return site;
}

export function getEras(): Era[] {
  return eras;
}

export function getEra(id: EraId): Era {
  const era = eras.find((e) => e.id === id);
  if (!era) throw new Error(`Unknown era: ${id}`);
  return era;
}

export function getReleases(): PublicRelease[] {
  return releases.map((r) => withMedia(r.slug));
}

export function getRelease(slug: string): PublicRelease | undefined {
  return releases.some((r) => r.slug === slug) ? withMedia(slug) : undefined;
}

/** The release the hero promotes: the newest era's most recent (highest position) release. */
export function getLatest(): PublicRelease {
  const latestEra = eras[eras.length - 1];
  const candidates = releases
    .filter((r) => r.eraId === latestEra?.id)
    .sort((a, b) => b.position - a.position);
  const pick = candidates[0] ?? releases[releases.length - 1];
  if (!pick) throw new Error("No releases defined");
  return withMedia(pick.slug);
}

function withVeil(slot: SealedSlot): PublicSlot {
  const veilMedia = slot.veil ? media.veils?.[slot.id] : undefined;
  return veilMedia ? { ...slot, veilMedia } : slot;
}

export function getSlots(kind?: SealedSlot["kind"]): PublicSlot[] {
  return (kind ? slots.filter((s) => s.kind === kind) : slots).map(withVeil);
}

/** Eras in order, each with its public releases and sealed slots interleaved by position. */
export function getChapters(): Chapter[] {
  return eras.map((era) => {
    const items: ChapterItem[] = [
      ...releases
        .filter((r) => r.eraId === era.id)
        .map((r) => ({
          type: "release" as const,
          release: withMedia(r.slug),
          position: r.position,
        })),
      ...slots
        .filter((s) => s.eraId === era.id && s.kind !== "transmission")
        .map((s) => ({ type: "sealed" as const, slot: withVeil(s), position: s.position })),
    ]
      .sort((a, b) => a.position - b.position)
      .map(({ position: _position, ...item }) => item as ChapterItem);
    return { era, items };
  });
}

/** Neighbouring public releases for "next chapter" navigation. */
export function getAdjacent(slug: string): { prev?: PublicRelease; next?: PublicRelease } {
  const ordered = eras.flatMap((era) =>
    releases.filter((r) => r.eraId === era.id).sort((a, b) => a.position - b.position),
  );
  const i = ordered.findIndex((r) => r.slug === slug);
  const prev = i > 0 ? ordered[i - 1] : undefined;
  const next = i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : undefined;
  return {
    prev: prev ? withMedia(prev.slug) : undefined,
    next: next ? withMedia(next.slug) : undefined,
  };
}

export function getBrandMedia(): MediaManifest["brand"] {
  return media.brand;
}

export type * from "./types";
export { findPlaceholders } from "./validate";
