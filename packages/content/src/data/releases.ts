import type { Release } from "../types";

/**
 * Public releases only. To reveal something new, add its full record here on announce day
 * (see AGENTS.md → Reveal playbook). Never add an unannounced release, even commented out.
 */
export const releases: Release[] = [
  {
    slug: "dystopia",
    eraId: "dystopia",
    kind: "album",
    title: "DYSTOPIA",
    visibility: "released",
    releaseDate: "2026-06-26",
    spotify: {
      uri: "spotify:album:6Nci10l2iCZsZgIZas3feF",
      url: "https://open.spotify.com/album/6Nci10l2iCZsZgIZas3feF",
    },
    tracks: [
      { title: "dystopia", uri: "spotify:track:7lmXHpEAIGhRLDcZSCkRNC", durationMs: 49800 },
      { title: "secrets", uri: "spotify:track:3cdxzdLwXL0kchltjbVCaD", durationMs: 236720 },
      { title: "ends meet", uri: "spotify:track:4XMla1DVvgl1HXvFUwQo3F", durationMs: 270640 },
      { title: "thrown", uri: "spotify:track:7kukpqAgSF0Kws8YlF0khf", durationMs: 194371 },
      { title: "pawn", uri: "spotify:track:5SO7nBvzpMUYQwrwzcGLzA", durationMs: 272000 },
      { title: "the veil", uri: "spotify:track:5vir8nmHJ6XgewQcn4JF4A", durationMs: 290920 },
      {
        title: "the system will fall",
        uri: "spotify:track:4SkUUjfVZRPrxXckMKBlVH",
        durationMs: 253120,
      },
      {
        title: "fracture the throne",
        uri: "spotify:track:1ybUeGe2hDZrOfRzwqDoky",
        durationMs: 229360,
      },
      { title: "utopia", uri: "spotify:track:4RmhPPmoXvJW5fBjDxWpZ5", durationMs: 234880 },
    ],
    grade: "dystopia",
    position: 1,
  },
  {
    slug: "house-of-ash",
    eraId: "ii",
    kind: "single",
    title: "HOUSE OF ASH",
    visibility: "announced",
    // Fill in when known: announceDate, releaseDate (YYYY-MM-DD), presaveUrl, spotify.
    teaser: { start: "auto", duration: 30 },
    grade: "house-of-ash",
    position: 1,
  },
];
