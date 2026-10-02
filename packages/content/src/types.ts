/**
 * Content model for the Black Throne world.
 *
 * Unannounced releases DO NOT exist here. Until reveal day they are represented only by
 * author-written `SealedSlot`s, so nothing about them can leak into a build or into git.
 */

export type EraId = "dystopia" | "ii";
export type GradeId = "dystopia" | "ii" | "house-of-ash";
export type Platform = "spotify" | "youtube" | "instagram" | "tiktok";

/** A colour grade + world parameters. Every chapter (and release) re-grades the whole site. */
export interface Grade {
  id: GradeId;
  /** Deepest background. */
  void: string;
  /** Raised surfaces, panels. */
  ash: string;
  /** Primary text. */
  bone: string;
  /** Secondary text (must keep >= 4.5:1 on `void`). */
  smoke: string;
  /** Signal colour: CTAs, focus, progress. */
  accent: string;
  /** Light shaft, embers, burn edges. */
  glow: string;
  /** Tint of the smoke itself. */
  fog: string;
  /** 0..1 dials read by the WebGL world and CSS layers. */
  world: {
    smoke: number;
    embers: number;
    shaft: number;
    grain: number;
    glitch: number;
    scanlines: number;
  };
}

export interface Era {
  id: EraId;
  numeral: string;
  /** `null` while the era is veiled — the site "becomes" its title on reveal day. */
  title: string | null;
  grade: GradeId;
  /** Lowercase mono lines shown in the HUD while this era is on screen. */
  hud: string[];
}

export interface Track {
  title: string;
  uri: string;
  durationMs: number;
}

export interface VideoSource {
  id: string;
  title: string;
  /** Filename inside `assets/<slug>/` processed by `pnpm media`. */
  file?: string;
  youtubeId?: string;
  orientation: "portrait" | "landscape";
}

export interface Release {
  slug: string;
  eraId: EraId;
  kind: "single" | "album";
  title: string;
  visibility: "announced" | "released";
  /** ISO date (YYYY-MM-DD) or datetime with offset. Date-only = local midnight for the visitor. */
  announceDate?: string;
  releaseDate?: string;
  spotify?: { uri: string; url: string };
  presaveUrl?: string;
  tracks?: Track[];
  /** Teaser cut from `assets/<slug>/master.wav`. `start: "auto"` picks the loudest window. */
  teaser?: { start: number | "auto"; duration: number };
  videos?: VideoSource[];
  grade: GradeId;
  /** Ordering inside the era. */
  position: number;
  /** Only ever artist-supplied text. Never invent lyrics. */
  epigraph?: string;
}

/** A cryptic placeholder for something not yet announced. Never derived from real data. */
export interface SealedSlot {
  id: string;
  eraId: EraId;
  kind: "single" | "album" | "transmission";
  position: number;
  label: string;
  hint?: string;
}

export interface SocialLink {
  platform: Platform;
  label: string;
  url: string;
  handle: string;
  /** True until the real URL is supplied — the build warns while any placeholder remains. */
  placeholder?: boolean;
}

export interface Site {
  name: string;
  tagline: string;
  description: string;
  thresholdLine: string;
  spotifyArtist: { uri: string; url: string };
  socials: SocialLink[];
}

/* ---------- media manifest (written by `pnpm media`) ---------- */

export interface CoverMedia {
  width: number;
  height: number;
  /** `srcset` strings for <picture>. */
  avif: string;
  webp: string;
  /** Largest WebP, used as <img src>. */
  src: string;
  /** JPEG for next/og (Satori cannot decode AVIF/WebP). Path inside /public. */
  og: string;
  blurDataURL: string;
  palette: { dominant: string; accent: string; dark: string };
}

export interface TeaserMedia {
  src: string;
  start: number;
  end: number;
  duration: number;
  /** 0..1 normalised peaks for the waveform. */
  peaks: number[];
}

export interface VideoMedia {
  id: string;
  title: string;
  src?: string;
  preview?: string;
  poster?: string;
  youtubeId?: string;
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
}

export interface ReleaseMedia {
  cover?: CoverMedia;
  teaser?: TeaserMedia;
  videos?: VideoMedia[];
}

export interface MediaManifest {
  /** Tintable mark (alpha mask) and its intrinsic size, for aspect-ratio. */
  brand?: { monogram?: string; width?: number; height?: number };
  releases: Record<string, ReleaseMedia>;
}

/* ---------- public, serialisable shapes handed to client components ---------- */

export interface PublicRelease extends Release {
  media: ReleaseMedia;
}

export type ChapterItem =
  | { type: "release"; release: PublicRelease }
  | { type: "sealed"; slot: SealedSlot };

export interface Chapter {
  era: Era;
  items: ChapterItem[];
}
