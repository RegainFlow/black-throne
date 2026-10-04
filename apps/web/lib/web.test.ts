import { grades } from "@black-throne/content/grades";
import type { PublicRelease, Site } from "@black-throne/content/types";
import { describe, expect, it } from "vitest";
import { gradeCss } from "./grade-css";
import { ldScript, musicGroup, releaseLd } from "./jsonld";

const site: Site = {
  name: "Black Throne",
  tagline: "t",
  description: "d",
  thresholdLine: "l",
  spotifyArtist: { uri: "spotify:artist:x", url: "https://open.spotify.com/artist/x" },
  socials: [
    {
      platform: "spotify",
      label: "Spotify",
      url: "https://open.spotify.com/artist/x",
      handle: "x",
    },
    {
      platform: "instagram",
      label: "Instagram",
      url: "https://instagram.com/",
      handle: "x",
      placeholder: true,
    },
  ],
  merch: { enabled: true },
};

const album: PublicRelease = {
  slug: "dystopia",
  eraId: "dystopia",
  kind: "album",
  title: "DYSTOPIA",
  visibility: "released",
  releaseDate: "2026-06-26",
  tracks: [{ title: "dystopia", uri: "spotify:track:7lmXHpEAIGhRLDcZSCkRNC", durationMs: 49800 }],
  grade: "dystopia",
  position: 1,
  media: {},
};

describe("gradeCss", () => {
  it("emits a rule for every grade from the content package", () => {
    const css = gradeCss();
    for (const g of Object.values(grades)) {
      expect(css).toContain(`html[data-grade="${g.id}"]`);
      expect(css).toContain(g.accent);
    }
  });
});

describe("JSON-LD", () => {
  const origin = new URL("https://example.com");

  it("never lists placeholder socials in sameAs", () => {
    expect(musicGroup(site, [album], origin).sameAs).toEqual(["https://open.spotify.com/artist/x"]);
  });

  it("describes albums with ISO track durations", () => {
    const ld = releaseLd(album, site, origin) as { track: { duration: string }[]; url: string };
    expect(ld.url).toBe("https://example.com/chapters/dystopia");
    expect(ld.track[0]?.duration).toBe("PT0M50S");
  });

  it("escapes `<` so content can't break out of the script tag", () => {
    expect(ldScript({ x: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
