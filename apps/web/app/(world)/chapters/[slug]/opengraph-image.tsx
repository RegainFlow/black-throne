import { getEra, getRelease, getReleases } from "@black-throne/content";
import { notFound } from "next/navigation";
import { ogSize, renderOg } from "@/lib/og";

export const alt = "Black Throne release artwork";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getReleases().map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const release = getRelease(slug);
  if (!release) notFound();
  const era = getEra(release.eraId);
  const cover = release.media.cover;
  return renderOg({
    title: release.title,
    kicker: `CHAPTER ${era.numeral}${era.title && era.title !== release.title ? ` · ${era.title}` : ""} · ${release.kind.toUpperCase()}`,
    line: release.visibility === "released" ? "out now" : "announced — arriving soon",
    grade: release.grade,
    cover: cover ? { path: cover.og, width: cover.width, height: cover.height } : undefined,
  });
}
