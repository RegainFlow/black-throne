import { getEras, getLatest, getReleases, getSite } from "@black-throne/content";
import { aboutModel } from "@/lib/about";
import { buildLlmsTxt } from "@/lib/llms";
import { siteUrl } from "@/lib/site-url";

// Prerendered at build time, so the sealed-leak check scans it like every other page.
export const dynamic = "force-static";

export function GET() {
  const origin = siteUrl();
  const model = aboutModel({
    site: getSite(),
    eras: getEras(),
    releases: getReleases(),
    latest: getLatest(),
    origin,
  });
  return new Response(buildLlmsTxt(model, origin), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
