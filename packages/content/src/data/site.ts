import type { Site } from "../types";

export const site: Site = {
  name: "Black Throne",
  tagline: "heavy sound. dark truth.",
  description:
    "Black Throne — heavy, emotional metal. Every album is a chapter of the same world, and every chapter explores a different kind of weight.",
  thresholdLine: "every album explores a different kind of weight.",
  spotifyArtist: {
    uri: "spotify:artist:5HKie7sKmVhnOfQJP709Fs",
    url: "https://open.spotify.com/artist/5HKie7sKmVhnOfQJP709Fs",
  },
  socials: [
    {
      platform: "spotify",
      label: "Spotify",
      url: "https://open.spotify.com/artist/5HKie7sKmVhnOfQJP709Fs",
      handle: "black throne",
    },
    {
      platform: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/theblackthrone.official/",
      handle: "@theblackthrone.official",
    },
    {
      platform: "tiktok",
      label: "TikTok",
      url: "https://www.tiktok.com/@theblackthrone.official",
      handle: "@theblackthrone.official",
    },
    {
      platform: "youtube",
      label: "YouTube",
      // PLACEHOLDER — hidden on the site until the real channel URL replaces it.
      url: "https://www.youtube.com/",
      handle: "",
      placeholder: true,
    },
  ],
  // Artist facts for /about, /llms.txt and JSON-LD. Never guess: leave a field unset until the
  // artist confirms it (production builds list the missing ones). Never mention anything sealed.
  profile: {
    alternateNames: ["BLACK THRONE"],
    genres: ["Metal"],
    // bio: ["…"],               artist-approved paragraphs (falls back to `description`)
    // origin: "City, Region, Country",
    // formed: "YYYY",
    // members: [{ name: "…", role: "…" }],
    // influences: ["…"],
    // contact: { press: "…", booking: "…" },
  },
  // Official profiles beyond the social buttons, added as each one exists: Apple Music,
  // YouTube Music, Wikidata, MusicBrainz, Last.fm, Genius, Discogs, Bandsintown…
  profiles: [],
  merch: { enabled: true },
};
