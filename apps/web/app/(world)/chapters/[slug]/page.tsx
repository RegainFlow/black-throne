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
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { ldScript, releaseLd } from "@/lib/jsonld";
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
  const era = getEra(release.eraId);
  const description =
    release.visibility === "released"
      ? `${release.title} — ${release.kind} by Black Throne. Chapter ${era.numeral}${era.title ? `: ${era.title}` : ""}.`
      : `${release.title} — the new ${release.kind} from Black Throne. Announced.`;
  return {
    title: release.title,
    description,
    alternates: { canonical: `/chapters/${slug}` },
    openGraph: { title: `${release.title} — BLACK THRONE`, description, type: "music.album" },
    twitter: { title: `${release.title} — BLACK THRONE`, description },
  };
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

  return (
    <main id="main" data-page-grade={release.grade}>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from first-party content, `<` escaped
        dangerouslySetInnerHTML={{ __html: ldScript(releaseLd(release, site, siteUrl())) }}
      />

      <section className="relative px-gutter pt-[calc(var(--bt-nav-h)+8vh)] pb-[12vh]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            {cover && (
              <BurnReveal
                grade={release.grade}
                className="mx-auto max-w-sm border border-bone/10 md:max-w-none"
              >
                <CoverPicture
                  cover={cover}
                  alt={`${release.title} cover art`}
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
