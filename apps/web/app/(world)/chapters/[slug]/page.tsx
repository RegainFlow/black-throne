import { getAdjacent, getEra, getRelease, getReleases, getSite } from "@black-throne/content";
import { parseReleaseDate } from "@black-throne/content/state";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BurnReveal } from "@/components/chapters/BurnReveal";
import { ReleaseCtas } from "@/components/media/ReleaseCtas";
import { ReleaseStatus } from "@/components/media/ReleaseStatus";
import { SpotifyPlayer } from "@/components/media/SpotifyPlayer";
import { TeaserPlayer } from "@/components/media/TeaserPlayer";
import { VideoCard } from "@/components/media/VideoCard";
import { Footer } from "@/components/sections/Footer";
import { CoverPicture } from "@/components/ui/CoverPicture";
import { GlitchText } from "@/components/ui/GlitchText";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { formatReleaseDate } from "@/lib/about";
import { breadcrumbLd, releaseLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

// Only public releases exist as pages. Anything else — including anything sealed — is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getReleases().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/chapters/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const release = getRelease(slug);
  if (!release) return {};
  const { name } = getSite();
  const era = getEra(release.eraId);
  const chapter = `Chapter ${era.numeral}${era.title ? `: ${era.title}` : ""}`;
  const tracks = release.tracks ?? [];
  const what =
    release.kind === "album" && tracks.length > 1
      ? `the ${tracks.length}-track album`
      : `the ${release.kind}`;
  const when = release.releaseDate ? formatReleaseDate(release.releaseDate) : undefined;
  const description =
    release.visibility === "released"
      ? `${release.title}, ${what} by ${name}${when ? `, released ${when}` : ""}. ${chapter}.${release.spotify ? " Listen on Spotify." : ""}`
      : `${release.title}, the new ${release.kind} from ${name}${when ? `, out ${when}` : ""}. ${chapter}.`;
  const musicians = [siteUrl().href];
  return pageMeta({
    title: release.title,
    description,
    path: `/chapters/${slug}`,
    ownImage: true, // opengraph-image.tsx: the cover card
    og:
      release.kind === "album"
        ? { type: "music.album", musicians, releaseDate: release.releaseDate }
        : {
            type: "music.song",
            musicians,
            duration: tracks[0] ? Math.round(tracks[0].durationMs / 1000) : undefined,
          },
  });
}

export default async function ChapterPage({ params }: PageProps<"/chapters/[slug]">) {
  const { slug } = await params;
  const release = getRelease(slug);
  if (!release) notFound();
  const site = getSite();
  const era = getEra(release.eraId);
  const { prev, next } = getAdjacent(slug);
  const { cover, teaser, videos } = release.media;
  const year = release.releaseDate ? parseReleaseDate(release.releaseDate).getFullYear() : null;
  const origin = siteUrl();

  return (
    <main id="main" data-page-grade={release.grade}>
      <JsonLd data={releaseLd(release, site, origin)} />
      <JsonLd
        data={breadcrumbLd([
          { name: site.name, url: origin.href },
          { name: release.title, url: new URL(`/chapters/${release.slug}`, origin).href },
        ])}
      />

      <section className="relative px-gutter pt-[calc(var(--bt-nav-h)+8vh)] pb-[12vh]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            {cover && (
              <BurnReveal
                grade={release.grade}
                className={`mx-auto w-full border border-bone/10 ${
                  // Portrait posters stay poster-sized; square album art can fill the column.
                  cover.height > cover.width
                    ? "max-w-[15rem] sm:max-w-[17rem] md:max-w-[20rem]"
                    : "max-w-sm md:max-w-none"
                }`}
              >
                <CoverPicture
                  cover={cover}
                  alt={`${release.title} by ${site.name}, cover art`}
                  sizes="(min-width: 768px) 40vw, 90vw"
                  priority
                  className="h-auto w-full"
                />
              </BurnReveal>
            )}
          </div>
          <div className="flex flex-col gap-8 md:col-span-6 md:col-start-7">
            <div className="mono-label flex flex-wrap items-center gap-4">
              <span className="text-accent">chapter {era.numeral.toLowerCase()}</span>
              <span aria-hidden="true" className="h-px w-10 bg-smoke/40" />
              <span>{era.title ? era.title.toLowerCase() : "untitled"}</span>
              <span aria-hidden="true">·</span>
              <span>{release.kind}</span>
              {year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{year}</span>
                </>
              )}
            </div>
            <h1 className="display-title text-[clamp(2.6rem,7vw,6rem)] text-bone">
              <GlitchText every={[10, 18]}>{release.title}</GlitchText>
            </h1>
            {release.epigraph && (
              <p className="font-serif text-2xl text-bone/70 italic">{release.epigraph}</p>
            )}
            <ReleaseStatus visibility={release.visibility} releaseDate={release.releaseDate} />
            {!release.spotify && teaser && <TeaserPlayer teaser={teaser} title={release.title} />}
            <ReleaseCtas
              location="chapter"
              align="start"
              artistUrl={site.spotifyArtist.url}
              release={{
                slug: release.slug,
                visibility: release.visibility,
                releaseDate: release.releaseDate,
                spotify: release.spotify,
                presaveUrl: release.presaveUrl,
              }}
            />
          </div>
        </div>
      </section>

      {release.spotify && (
        <section aria-labelledby="chapter-listen" className="px-gutter py-[10vh]">
          <div className="mx-auto flex max-w-7xl flex-col gap-12">
            <SectionHeading index="◉" id="chapter-listen" title="Listen" />
            <SpotifyPlayer
              items={[
                {
                  slug: release.slug,
                  title: release.title,
                  uri: release.spotify.uri,
                  tracks: release.tracks,
                },
              ]}
            />
          </div>
        </section>
      )}

      {videos && videos.length > 0 && (
        <section aria-labelledby="chapter-visions" className="px-gutter py-[10vh]">
          <div className="mx-auto flex max-w-7xl flex-col gap-12">
            <SectionHeading index="◉" id="chapter-visions" title="Visions" />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
              {videos.map((v) => (
                <li key={v.id}>
                  <VideoCard video={v} release={release.slug} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <nav aria-label="More chapters" className="grid border-y border-bone/10 md:grid-cols-2">
        {[prev, next].map((r, i) =>
          r ? (
            <TransitionLink
              key={r.slug}
              href={`/chapters/${r.slug}`}
              className={`group flex flex-col gap-3 px-gutter py-14 transition-colors hover:bg-bone/[0.03] ${
                i === 1 ? "md:items-end md:border-l md:border-bone/10 md:text-right" : ""
              }`}
            >
              <span className="mono-label">
                {i === 0 ? "← previous chapter" : "next chapter →"}
              </span>
              <span className="display-title text-3xl text-bone transition-colors group-hover:text-accent md:text-5xl">
                {r.title}
              </span>
            </TransitionLink>
          ) : (
            <TransitionLink
              key={i === 0 ? "home-prev" : "home-next"}
              href={i === 0 ? "/" : "/#chapters"}
              className={`group flex flex-col gap-3 px-gutter py-14 ${i === 1 ? "md:items-end md:border-l md:border-bone/10 md:text-right" : ""}`}
            >
              <span className="mono-label">{i === 0 ? "← the throne" : "what comes next →"}</span>
              <span className="display-title text-3xl text-bone/30 md:text-5xl">
                {i === 0 ? "Return" : "Not yet"}
              </span>
            </TransitionLink>
          ),
        )}
      </nav>

      <Footer site={site} releases={getReleases()} />
    </main>
  );
}
