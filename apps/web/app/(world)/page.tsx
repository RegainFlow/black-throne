import { getChapters, getLatest, getReleases, getSite, getSlots } from "@black-throne/content";
import { Chapters } from "@/components/sections/Chapters";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Latest } from "@/components/sections/Latest";
import { Listen } from "@/components/sections/Listen";
import { Signals } from "@/components/sections/Signals";
import { Visions } from "@/components/sections/Visions";
import { ldScript, musicGroup } from "@/lib/jsonld";
import { siteUrl } from "@/lib/site-url";

export default function Home() {
  const site = getSite();
  const latest = getLatest();
  const releases = getReleases();

  return (
    <main id="main" data-page-grade="ii">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from first-party content, `<` escaped
        dangerouslySetInnerHTML={{ __html: ldScript(musicGroup(site, releases, siteUrl())) }}
      />
      <Hero site={site} latest={latest} />
      <Latest release={latest} site={site} />
      <Chapters chapters={getChapters()} />
      <Listen releases={releases} site={site} />
      <Visions releases={releases} transmissions={getSlots("transmission")} />
      <Signals site={site} />
      <Footer site={site} releases={releases} />
    </main>
  );
}
