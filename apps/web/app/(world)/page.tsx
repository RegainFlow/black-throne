import { getChapters, getLatest, getReleases, getSite } from "@black-throne/content";
import { Chapters } from "@/components/sections/Chapters";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Latest } from "@/components/sections/Latest";
import { Listen } from "@/components/sections/Listen";
import { Signals } from "@/components/sections/Signals";
import { JsonLd } from "@/components/ui/JsonLd";
import { musicGroup, websiteLd } from "@/lib/jsonld";
import { pageMeta, SITE_NAME } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

// "Official site" helps brand searches tell this artist apart from everything else named so.
export const metadata = pageMeta({
  title: { absolute: `${SITE_NAME} — Official Site` },
  description: getSite().description,
  path: "/",
});

export default function Home() {
  const site = getSite();
  const latest = getLatest();
  const releases = getReleases();
  const origin = siteUrl();

  return (
    <main id="main" data-page-grade="ii">
      {/* MusicGroup first: e2e reads the first ld+json script. */}
      <JsonLd data={musicGroup(site, releases, origin)} />
      <JsonLd data={websiteLd(site, origin)} />
      <Hero site={site} latest={latest} />
      <Latest release={latest} site={site} />
      <Chapters chapters={getChapters()} />
      <Listen releases={releases} site={site} />
      <Signals site={site} />
      <Footer site={site} releases={releases} />
    </main>
  );
}
