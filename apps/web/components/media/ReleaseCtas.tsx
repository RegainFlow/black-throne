"use client";

import { type ReleasePhase, releasePhase } from "@black-throne/content/state";
import type { PublicRelease } from "@black-throne/content/types";
import { useEffect, useState } from "react";
import { CtaLink } from "@/components/ui/Cta";
import { FragmentButton } from "./FragmentButton";

interface Props {
  release: Pick<PublicRelease, "slug" | "visibility" | "releaseDate" | "spotify" | "presaveUrl"> & {
    /** Teaser fragment URL; shows "hear a fragment" until the track is on Spotify. */
    teaserSrc?: string;
  };
  artistUrl: string;
  location: string;
  align?: "center" | "start";
}

/**
 * Promotion CTAs. Before release: pre-save (or follow the artist so it lands in Release
 * Radar) + the teaser. After: listen. Phase is resolved after mount (hydration-safe).
 */
export function ReleaseCtas({ release, artistUrl, location, align = "center" }: Props) {
  const [phase, setPhase] = useState<ReleasePhase>(
    release.visibility === "released" ? "out" : "announced",
  );

  useEffect(() => {
    setPhase(releasePhase(release, new Date()));
  }, [release]);

  const out = phase === "out";
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      {out && release.spotify ? (
        <CtaLink
          href={release.spotify.url}
          platform="spotify"
          location={location}
          release={release.slug}
        >
          listen on spotify
        </CtaLink>
      ) : release.presaveUrl ? (
        <CtaLink
          href={release.presaveUrl}
          platform="presave"
          location={location}
          release={release.slug}
        >
          pre-save
        </CtaLink>
      ) : (
        <CtaLink href={artistUrl} platform="spotify" location={location} release={release.slug}>
          follow on spotify
        </CtaLink>
      )}
      {/* The fragment stays until the full track is playable on Spotify. */}
      {release.teaserSrc && !(out && release.spotify) && (
        <FragmentButton location={location} src={release.teaserSrc} />
      )}
    </div>
  );
}
