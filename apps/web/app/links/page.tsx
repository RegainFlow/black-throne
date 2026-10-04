import { getLatest, getSite } from "@black-throne/content";
import Link from "next/link";
import { ReleaseCtas } from "@/components/media/ReleaseCtas";
import { ReleaseStatus } from "@/components/media/ReleaseStatus";
import { CoverPicture } from "@/components/ui/CoverPicture";
import { Monogram } from "@/components/ui/Monogram";
import { OutboundLink } from "@/components/ui/OutboundLink";
import { StaticBackdrop } from "@/components/world/StaticBackdrop";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Links",
  description: `${getSite().name}: the latest release and every official platform, in one place.`,
  path: "/links",
});

/**
 * Link-in-bio for Instagram/TikTok. Mobile-first, no WebGL, no threshold — it has to be instant.
 */
export default function LinksPage() {
  const site = getSite();
  const latest = getLatest();
  const cover = latest.media.cover;

  return (
    <>
      <StaticBackdrop />
      <main
        id="main"
        data-page-grade={latest.grade}
        className="relative z-10 mx-auto flex min-h-svh max-w-md flex-col items-center gap-10 px-5 py-14"
      >
        <Link
          href="/"
          className="flex flex-col items-center gap-5 text-bone"
          aria-label="Black Throne — enter the site"
        >
          <Monogram className="h-20" />
          <span className="type-wordmark pl-[0.28em] text-2xl tracking-[0.28em]">Black Throne</span>
        </Link>
        <p className="-mt-4 font-serif text-lg text-bone/60 italic">{site.tagline}</p>

        <section
          aria-label={`Latest: ${latest.title}`}
          className="flex w-full flex-col items-center gap-5 border border-bone/10 bg-void/80 p-5"
        >
          {cover && (
            <Link href={`/chapters/${latest.slug}`} className="block w-40">
              <CoverPicture
                cover={cover}
                alt={`${latest.title} by ${site.name}, cover art`}
                sizes="160px"
                priority
                className="h-auto w-full"
              />
            </Link>
          )}
          <span className="mono-label">new</span>
          <span className="display-title -mt-2 text-2xl text-bone">{latest.title}</span>
          <ReleaseStatus visibility={latest.visibility} releaseDate={latest.releaseDate} />
          <ReleaseCtas
            location="links"
            artistUrl={site.spotifyArtist.url}
            release={{
              slug: latest.slug,
              visibility: latest.visibility,
              releaseDate: latest.releaseDate,
              spotify: latest.spotify,
              presaveUrl: latest.presaveUrl,
              teaserSrc: latest.media.teaser?.src,
            }}
          />
        </section>

        <ul className="flex w-full flex-col gap-3">
          {site.socials
            .filter((s) => !s.placeholder)
            .map((s) => (
              <li key={s.platform}>
                <OutboundLink
                  href={s.url}
                  platform={s.platform}
                  location="links"
                  className="group flex w-full items-center justify-between gap-4 border border-bone/15 bg-void/80 px-5 py-4 transition-colors hover:border-accent"
                >
                  <span className="display-title shrink-0 text-base text-bone">{s.label}</span>
                  <span className="mono-label flex min-w-0 items-center gap-2 transition-colors group-hover:text-accent">
                    <span className="truncate">{s.handle}</span>
                    <span aria-hidden="true">↗</span>
                  </span>
                </OutboundLink>
              </li>
            ))}
          {site.merch.enabled && (
            <li>
              <Link
                href="/merch"
                className="group flex w-full items-center justify-between gap-4 border border-bone/15 bg-void/80 px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="display-title shrink-0 text-base text-bone">Merch</span>
                <span className="mono-label flex min-w-0 items-center gap-2 transition-colors group-hover:text-accent">
                  <span className="truncate">official store</span>
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/"
              className="flex w-full items-center justify-between border border-bone/15 bg-bone px-5 py-4 text-void transition-colors hover:bg-accent"
            >
              <span className="display-title text-base">Enter the world</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </main>
    </>
  );
}
