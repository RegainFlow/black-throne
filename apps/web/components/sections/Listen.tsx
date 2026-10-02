import type { PublicRelease, Site } from "@black-throne/content/types";
import { type Playable, SpotifyPlayer } from "@/components/media/SpotifyPlayer";
import { CtaLink } from "@/components/ui/Cta";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Listen({ releases, site }: { releases: PublicRelease[]; site: Site }) {
  const playable: Playable[] = releases
    .filter((r) => r.spotify)
    .reverse()
    .map((r) => ({ slug: r.slug, title: r.title, uri: r.spotify?.uri ?? "", tracks: r.tracks }));

  return (
    <section id="listen" aria-labelledby="listen-title" className="relative px-gutter py-[14vh]">
      <div className="mx-auto flex max-w-7xl flex-col gap-14">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            index="02"
            id="listen-title"
            title="Listen"
            kicker={<span>press play. let it in.</span>}
          />
          <CtaLink
            href={site.spotifyArtist.url}
            platform="spotify"
            location="listen"
            variant="ghost"
          >
            follow on spotify
          </CtaLink>
        </div>
        {playable.length > 0 ? (
          <SpotifyPlayer items={playable} />
        ) : (
          <p className="mono-label">nothing to play yet.</p>
        )}
      </div>
    </section>
  );
}
