import type { Era, PublicRelease, Site } from "@black-throne/content/types";

/**
 * The artist's public facts, shared by /about and /llms.txt so they can't drift apart.
 *
 * Sealed: built only from the site profile, eras and **public** releases. It never takes slots,
 * and it never says anything about what comes next. Every sentence comes from content data, and
 * profile facts that aren't set yet are left out rather than guessed.
 */
export interface AboutModel {
  name: string;
  summary: string;
  bio: string[];
  facts: { label: string; value: string }[];
  discography: DiscographyEntry[];
  /** Official profiles (non-placeholder socials, then `site.profiles`). */
  links: { label: string; url: string; note?: string }[];
  merchUrl?: string;
  contact: { label: string; email: string }[];
  faq: { q: string; a: string }[];
}

export interface DiscographyEntry {
  slug: string;
  title: string;
  kind: "album" | "single";
  /** "Released June 26, 2026", "Release date: …" or "Announced". */
  status: string;
  /** "Chapter I: DYSTOPIA", or "Chapter II" while the era is untitled. */
  chapter: string;
  url: string;
  spotify?: string;
  presave?: string;
  tracks: { title: string; duration: string }[];
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

/** "June 26, 2026" from a content date. Uses the calendar date as written, in any time zone. */
export function formatReleaseDate(date: string): string {
  return dateFormat.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

const year = (date?: string) => date?.slice(0, 4);

const duration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** "a, b and c". */
const list = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const chapterLabel = (era: Era | undefined) =>
  era ? `Chapter ${era.numeral}${era.title ? `: ${era.title}` : ""}` : "";

function status(r: PublicRelease): string {
  if (r.visibility === "released") {
    return r.releaseDate ? `Released ${formatReleaseDate(r.releaseDate)}` : "Released";
  }
  return r.releaseDate ? `Release date: ${formatReleaseDate(r.releaseDate)}` : "Announced";
}

export function aboutModel({
  site,
  eras,
  releases,
  latest,
  origin,
}: {
  site: Site;
  eras: Era[];
  releases: PublicRelease[];
  latest: PublicRelease;
  origin: URL;
}): AboutModel {
  const { profile } = site;
  const abs = (path: string) => new URL(path, origin).href;
  const linksPage = `${origin.host}/links`;

  const discography: DiscographyEntry[] = [...releases]
    // Newest first; an announced release without a date sorts to the top.
    .sort((a, b) => (b.releaseDate ?? "9999").localeCompare(a.releaseDate ?? "9999"))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      kind: r.kind,
      status: status(r),
      chapter: chapterLabel(eras.find((e) => e.id === r.eraId)),
      url: abs(`/chapters/${r.slug}`),
      spotify: r.spotify?.url,
      presave: r.presaveUrl,
      tracks: (r.tracks ?? []).map((t) => ({ title: t.title, duration: duration(t.durationMs) })),
    }));

  const members = profile.members?.map((m) => (m.role ? `${m.name} (${m.role})` : m.name));
  const facts = [
    { label: profile.genres.length > 1 ? "Genres" : "Genre", value: list(profile.genres) },
    { label: "Origin", value: profile.origin },
    { label: "Formed", value: profile.formed },
    { label: "Lineup", value: members?.length ? list(members) : undefined },
    {
      label: "Influences",
      value: profile.influences?.length ? list(profile.influences) : undefined,
    },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const socials = site.socials.filter((s) => !s.placeholder);
  const links = [
    ...socials.map((s) => ({
      label: s.label,
      url: s.url,
      note: s.handle.startsWith("@") ? s.handle : undefined,
    })),
    ...site.profiles.map((p) => ({ label: p.label, url: p.url })),
  ];
  const merchUrl = site.merch.enabled ? abs("/merch") : undefined;

  const contact = [
    { label: "Press", email: profile.contact?.press },
    { label: "Booking", email: profile.contact?.booking },
  ].filter((c): c is { label: string; email: string } => Boolean(c.email));

  const released = (kind: PublicRelease["kind"]) =>
    releases
      .filter((r) => r.kind === kind && r.visibility === "released")
      .map((r) => (r.releaseDate ? `${r.title} (${year(r.releaseDate)})` : r.title));
  const albums = released("album");
  const singles = released("single");
  const others = socials.filter((s) => s.platform !== "spotify").map((s) => s.label);

  const faq: AboutModel["faq"] = [
    { q: `Who is ${site.name}?`, a: site.description },
    {
      q: `What genre is ${site.name}?`,
      a: `${site.name} plays ${list(profile.genres).toLowerCase()}.`,
    },
  ];
  if (profile.origin) {
    faq.push({
      q: `Where is ${site.name} from?`,
      a: `${site.name} is from ${profile.origin}${profile.formed ? `, and formed in ${profile.formed}` : ""}.`,
    });
  }
  if (members?.length) {
    faq.push({ q: `Who is in ${site.name}?`, a: `${list(members)}.` });
  }
  faq.push({
    q: `What is ${site.name}'s latest release?`,
    a: `${latest.title}, ${latest.kind === "album" ? "an album" : "a single"}. ${status(latest)}.`,
  });
  if (albums.length || singles.length) {
    faq.push({
      q: `What has ${site.name} released?`,
      a: [
        albums.length && `${albums.length > 1 ? "Albums" : "Album"}: ${list(albums)}.`,
        singles.length && `${singles.length > 1 ? "Singles" : "Single"}: ${list(singles)}.`,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  faq.push({
    q: `Where can I listen to ${site.name}?`,
    a: `${site.name} is on Spotify${others.length ? `, and on ${list(others)}` : ""}. Every official link is at ${linksPage}.`,
  });
  if (merchUrl) {
    faq.push({
      q: `Does ${site.name} have official merch?`,
      a: `Yes. The official store is at ${origin.host}/merch. Checkout, payment and shipping are handled by Fourthwall.`,
    });
  }

  return {
    name: site.name,
    summary: site.description,
    bio: profile.bio?.length ? profile.bio : [site.description],
    facts,
    discography,
    links,
    merchUrl,
    contact,
    faq,
  };
}
