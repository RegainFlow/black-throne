import { getSite } from "@black-throne/content";
import { ogSize, renderOg } from "@/lib/og";

export const alt = "BLACK THRONE — merch";
export const size = ogSize;
export const contentType = "image/png";

/** Static share card for /merch: no live product data, so it's safe to build. */
export default async function Image() {
  return renderOg({
    title: "MERCH",
    kicker: "OFFICIAL · BLACK THRONE",
    line: getSite().tagline,
    grade: "ii",
  });
}
