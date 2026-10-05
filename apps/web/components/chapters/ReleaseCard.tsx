import { parseReleaseDate } from "@black-throne/content/state";
import type { PublicRelease } from "@black-throne/content/types";
import { CoverPicture } from "@/components/ui/CoverPicture";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { BurnReveal } from "./BurnReveal";

/** A revealed chapter fragment: artwork + minimal metadata, opens the chapter page. */
export function ReleaseCard({ release, sizes }: { release: PublicRelease; sizes: string }) {
  const { cover } = release.media;
  const year = release.releaseDate ? parseReleaseDate(release.releaseDate).getFullYear() : null;
  const meta = [
    release.kind,
    release.tracks && release.tracks.length > 1 ? `${release.tracks.length} tracks` : null,
    year,
    release.visibility === "announced" ? "announced" : null,
  ].filter(Boolean);

  return (
    <TransitionLink
      href={`/chapters/${release.slug}`}
      className="group flex flex-col gap-4 focus-visible:outline-none"
    >
      <div className="relative overflow-hidden border border-bone/10 transition-colors duration-700 group-hover:border-accent/50 group-focus-visible:border-accent">
        {cover ? (
          <BurnReveal grade={release.grade}>
            <CoverPicture
              cover={cover}
              alt=""
              sizes={sizes}
              className="h-auto w-full transition-[transform,filter] duration-[1.6s] ease-[var(--ease-sink)] group-hover:scale-[1.03] group-hover:brightness-110"
            />
          </BurnReveal>
        ) : (
          <div className="aspect-square bg-ash" />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-void/90 to-transparent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="display-title text-lg text-bone transition-colors group-hover:text-accent">
          {release.title}
        </span>
        <span className="mono-label shrink-0">{meta.join(" · ")}</span>
      </div>
    </TransitionLink>
  );
}
