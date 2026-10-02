import { getLatest, getSite } from "@black-throne/content";
import { ogSize, renderOg } from "@/lib/og";

export const alt = "BLACK THRONE — heavy sound. dark truth.";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  const latest = getLatest();
  const cover = latest.media.cover;
  return renderOg({
    title: "BLACK THRONE",
    kicker: `NEW · ${latest.title}`,
    line: getSite().tagline,
    grade: latest.grade,
    cover: cover ? { path: cover.og, width: cover.width, height: cover.height } : undefined,
  });
}
