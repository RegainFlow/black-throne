import type { PublicRelease, PublicSlot } from "@black-throne/content/types";
import { SealedSlot } from "@/components/chapters/SealedSlot";
import { VideoCard } from "@/components/media/VideoCard";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Moving images: upcoming (veiled) transmissions first, then released videos, newest first. */
export function Visions({
  releases,
  transmissions,
}: {
  releases: PublicRelease[];
  transmissions: PublicSlot[];
}) {
  const videos = [...releases]
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .flatMap((r) => (r.media.videos ?? []).map((v) => ({ video: v, release: r.slug })));

  return (
    <section id="visions" aria-labelledby="visions-title" className="relative px-gutter py-[14vh]">
      <div className="mx-auto flex max-w-7xl flex-col gap-14">
        <SectionHeading
          index="03"
          id="visions-title"
          title="Visions"
          kicker={<span>moving images from the world</span>}
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
          {transmissions.map((slot) => (
            <li key={slot.id}>
              <SealedSlot slot={slot} />
            </li>
          ))}
          {videos.map(({ video, release }) => (
            <li key={`${release}-${video.id}`}>
              <VideoCard video={video} release={release} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
