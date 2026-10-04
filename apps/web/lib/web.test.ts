import { grades } from "@black-throne/content/grades";
import type { Era, PublicRelease, Site } from "@black-throne/content/types";
import { describe, expect, it } from "vitest";
import { aboutModel, formatReleaseDate } from "./about";
import { gradeCss } from "./grade-css";
import { artistId, faqLd, ldScript, musicGroup, releaseLd, websiteLd } from "./jsonld";
import { buildLlmsTxt } from "./llms";
import { clip } from "./seo";

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
  profile: { alternateNames: ["BLACK THRONE"], genres: ["Metal"] },
  profiles: [{ label: "Wikidata", url: "https://www.wikidata.org/wiki/Q1" }],
  merch: { enabled: true },
};

const eras: Era[] = [
  { id: "dystopia", numeral: "I", title: "DYSTOPIA", grade: "dystopia", hud: [] },
  { id: "ii", numeral: "II", title: null, grade: "ii", hud: [] },
];

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

const single: PublicRelease = {
  slug: "house-of-ash",
  eraId: "ii",
  kind: "single",
  title: "HOUSE OF ASH",
  visibility: "released",
  releaseDate: "2026-10-02",
  spotify: {
    uri: "spotify:album:7b1l5pwD1JqPKaRRGpWmc2",
    url: "https://open.spotify.com/album/7b1l5pwD1JqPKaRRGpWmc2",
  },
  tracks: [
    { title: "House of Ash", uri: "spotify:track:1oFvoXElizQ1JPDUl5fl9D", durationMs: 278040 },
  ],
  grade: "house-of-ash",
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

  it("lists every official profile in sameAs, never placeholder socials", () => {
    expect(musicGroup(site, [album], origin).sameAs).toEqual([
      "https://open.spotify.com/artist/x",
      "https://www.wikidata.org/wiki/Q1",
    ]);
  });

  it("leaves unset artist facts out instead of guessing", () => {
    const ld = musicGroup(site, [album], origin);
    expect(ld.foundingDate).toBeUndefined();
    expect(ld.foundingLocation).toBeUndefined();
    expect(ld.member).toBeUndefined();
    expect(ld.genre).toEqual(["Metal"]);
  });

  it("ties releases and the website to one artist node", () => {
    const id = artistId(origin);
    expect(musicGroup(site, [album], origin)["@id"]).toBe(id);
    expect(websiteLd(site, origin).publisher).toEqual({ "@id": id });
    expect(releaseLd(single, site, origin).byArtist["@id"]).toBe(id);
  });

  it("models singles as single-release albums, linked to Spotify", () => {
    const ld = releaseLd(single, site, origin);
    expect(ld["@type"]).toBe("MusicAlbum");
    expect(ld.albumReleaseType).toBe("https://schema.org/SingleRelease");
    expect(ld.sameAs).toEqual([single.spotify?.url]);
    expect(releaseLd(album, site, origin).albumReleaseType).toBe("https://schema.org/AlbumRelease");
  });

  it("builds a FAQ page", () => {
    const ld = faqLd([{ q: "Q?", a: "A." }]);
    expect(ld.mainEntity[0]).toMatchObject({ name: "Q?", acceptedAnswer: { text: "A." } });
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

describe("about + llms.txt", () => {
  const origin = new URL("https://example.com");
  const model = (s: Site = site) =>
    aboutModel({ site: s, eras, releases: [album, single], latest: single, origin });

  it("formats content dates as written, whatever the time zone", () => {
    expect(formatReleaseDate("2026-06-26")).toBe("June 26, 2026");
    expect(formatReleaseDate("2026-10-02T00:00:00-07:00")).toBe("October 2, 2026");
  });

  it("lists releases newest first, with an untitled era as just its numeral", () => {
    const { discography } = model();
    expect(discography.map((d) => d.slug)).toEqual(["house-of-ash", "dystopia"]);
    expect(discography[0]?.chapter).toBe("Chapter II");
    expect(discography[1]?.chapter).toBe("Chapter I: DYSTOPIA");
    expect(discography[0]?.status).toBe("Released October 2, 2026");
  });

  it("only states facts that are set", () => {
    const bare = model();
    expect(bare.facts.map((f) => f.label)).toEqual(["Genre"]);
    expect(bare.faq.some((f) => f.q.includes("from"))).toBe(false);
    expect(bare.contact).toEqual([]);

    const full = model({
      ...site,
      profile: {
        ...site.profile,
        origin: "Somewhere",
        formed: "2020",
        contact: { booking: "booking@example.com" },
      },
    });
    expect(full.facts.map((f) => f.label)).toEqual(["Genre", "Origin", "Formed"]);
    expect(full.faq.find((f) => f.q.includes("from"))?.a).toBe(
      "Black Throne is from Somewhere, and formed in 2020.",
    );
    expect(full.contact).toEqual([{ label: "Booking", email: "booking@example.com" }]);
  });

  it("renders llms.txt with every release and official profile, and no placeholders", () => {
    const txt = buildLlmsTxt(model(), origin);
    expect(txt.startsWith("# Black Throne\n\n> d\n")).toBe(true);
    for (const r of [album, single]) {
      expect(txt).toContain(`[${r.title}](https://example.com/chapters/${r.slug})`);
    }
    expect(txt).toContain(single.spotify?.url);
    expect(txt).toContain("[Wikidata](https://www.wikidata.org/wiki/Q1)");
    expect(txt).not.toContain("instagram.com");
    expect(txt).not.toMatch(/undefined|null/);
    expect(txt).toContain("Chapter II.");
  });
});

describe("clip", () => {
  it("leaves short text alone and flattens whitespace", () => {
    expect(clip("  Heavy\n cotton.  ")).toBe("Heavy cotton.");
  });

  it("cuts long text on a word boundary, within the limit", () => {
    const out = clip("one two three four five", 12);
    expect(out).toBe("one two…");
    expect(out.length).toBeLessThanOrEqual(12);
  });
});
