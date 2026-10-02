import type { PublicRelease, Site } from "@black-throne/content/types";
import { BurnReveal } from "@/components/chapters/BurnReveal";
import { ReleaseCtas } from "@/components/media/ReleaseCtas";
import { ReleaseStatus } from "@/components/media/ReleaseStatus";
import { SpotifyEmbed } from "@/components/media/SpotifyEmbed";
import { TeaserPlayer } from "@/components/media/TeaserPlayer";
import { CoverPicture } from "@/components/ui/CoverPicture";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** The newest transmission: cover burns in, fragment plays, CTAs push to the platforms. */
export function Latest({ release, site }: { release: PublicRelease; site: Site }) {
  const { cover, teaser } = release.media;
  return (
    <section
      id="latest"
      aria-labelledby="latest-title"
      data-grade-section={release.grade}
      className="relative px-gutter py-[18vh]"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-5 md:col-start-1">
          {cover && (
            <BurnReveal grade={release.grade} className="mx-auto max-w-sm md:max-w-none">
              <TransitionLink
                href={`/chapters/${release.slug}`}
                aria-label={`${release.title} — open chapter`}
              >
                <CoverPicture
                  cover={cover}
                  alt={`${release.title} cover art`}
                  sizes="(min-width: 768px) 40vw, 90vw"
                  className="h-auto w-full shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9)]"
                />
              </TransitionLink>
            </BurnReveal>
          )}
        </div>

        <div className="flex flex-col gap-10 md:col-span-6 md:col-start-7">
          <SectionHeading
            index="new"
            id="latest-title"
            title={release.title}
            kicker={<span>{release.kind === "album" ? "album" : "single"}</span>}
          />
          {release.epigraph && (
            <p className="font-serif text-xl text-bone/70 italic">{release.epigraph}</p>
          )}
          <ReleaseStatus visibility={release.visibility} releaseDate={release.releaseDate} />

          {release.spotify ? (
            <SpotifyEmbed uri={release.spotify.uri} title={release.title} height={152} />
          ) : (
            teaser && <TeaserPlayer teaser={teaser} title={release.title} />
          )}

          <ReleaseCtas
            location="latest"
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
  );
}
