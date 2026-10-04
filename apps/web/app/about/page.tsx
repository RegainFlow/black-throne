import { getEras, getLatest, getReleases, getSite } from "@black-throne/content";
import Link from "next/link";
import { JsonLd } from "@/components/ui/JsonLd";
import { Monogram } from "@/components/ui/Monogram";
import { OutboundLink } from "@/components/ui/OutboundLink";
import { StaticBackdrop } from "@/components/world/StaticBackdrop";
import { aboutModel } from "@/lib/about";
import { faqLd, musicGroup } from "@/lib/jsonld";
import { pageMeta } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

const site = getSite();

export const metadata = pageMeta({
  title: "About",
  description: `${site.name}, the ${site.profile.genres.join(" / ").toLowerCase()} artist: biography, discography with tracklists, and every official link.`,
  path: "/about",
});

const heading = "display-title text-xl text-bone md:text-2xl";
const row = "border-t border-bone/10 py-5";
const listen = "mono-label self-start text-bone transition-colors hover:text-accent";

/**
 * The artist's facts in plain, crawlable HTML: what search engines and answer engines read.
 * Lean like /links (no WebGL, no threshold) and static, so the sealed-leak check scans it.
 * Same model as /llms.txt (lib/about.ts).
 */
export default function AboutPage() {
  const releases = getReleases();
  const origin = siteUrl();
  const m = aboutModel({ site, eras: getEras(), releases, latest: getLatest(), origin });

  return (
    <>
      <StaticBackdrop />
      <JsonLd data={musicGroup(site, releases, origin)} />
      <JsonLd data={faqLd(m.faq)} />
      <main
        id="main"
        data-page-grade="ii"
        className="relative z-10 mx-auto flex min-h-svh max-w-3xl flex-col gap-16 px-gutter py-14 md:py-20"
      >
        <header className="flex flex-col items-center gap-5 text-center">
          <Link href="/" className="text-bone" aria-label={`${site.name}: enter the site`}>
            <Monogram className="h-16" />
          </Link>
          <p className="mono-label">about</p>
          <h1 className="type-wordmark pl-[0.28em] text-[clamp(1.75rem,6vw,3rem)] tracking-[0.28em] text-bone">
            {site.name}
          </h1>
          <p className="font-serif text-lg text-bone/60 italic">{site.tagline}</p>
        </header>

        <section aria-labelledby="about-bio" className="flex flex-col gap-6">
          <h2 id="about-bio" className="sr-only">
            Biography
          </h2>
          {m.bio.map((p) => (
            <p key={p} className="font-serif text-xl text-bone/85 leading-relaxed md:text-2xl">
              {p}
            </p>
          ))}
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-bone/10 pt-6">
            {m.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="mono-label">{f.label}</dt>
                <dd className="text-bone/85">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="about-music" className="flex flex-col gap-2">
          <h2 id="about-music" className={heading}>
            Discography
          </h2>
          <ol>
            {m.discography.map((d) => (
              <li key={d.slug} className={`${row} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="display-title text-lg text-bone">
                    <Link href={`/chapters/${d.slug}`} className="hover:text-accent">
                      {d.title}
                    </Link>
                  </h3>
                  <p className="mono-label">
                    {d.kind} · {d.chapter}
                  </p>
                </div>
                <p className="mono-label">{d.status}</p>
                {d.tracks.length > 1 && (
                  <ol className="list-inside list-decimal font-serif text-lg text-bone/70 marker:font-mono marker:text-xs marker:text-smoke">
                    {d.tracks.map((t) => (
                      <li key={t.title}>
                        {t.title} <span className="mono-label">{t.duration}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {d.spotify ? (
                  <OutboundLink
                    href={d.spotify}
                    platform="spotify"
                    location="about"
                    release={d.slug}
                    className={listen}
                  >
                    listen on spotify ↗
                  </OutboundLink>
                ) : (
                  d.presave && (
                    <OutboundLink
                      href={d.presave}
                      platform="presave"
                      location="about"
                      release={d.slug}
                      className={listen}
                    >
                      pre-save ↗
                    </OutboundLink>
                  )
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="about-links" className="flex flex-col gap-2">
          <h2 id="about-links" className={heading}>
            Official links
          </h2>
          <ul>
            {site.socials
              .filter((s) => !s.placeholder)
              .map((s) => (
                <li key={s.platform} className={row}>
                  <OutboundLink
                    href={s.url}
                    platform={s.platform}
                    location="about"
                    className="flex items-baseline justify-between gap-4 text-bone transition-colors hover:text-accent"
                  >
                    <span className="display-title text-base">{s.label}</span>
                    <span className="mono-label truncate">{s.handle} ↗</span>
                  </OutboundLink>
                </li>
              ))}
            {site.profiles.map((p) => (
              <li key={p.url} className={row}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-baseline justify-between gap-4 text-bone transition-colors hover:text-accent"
                >
                  <span className="display-title text-base">{p.label}</span>
                  <span className="mono-label">↗</span>
                </a>
              </li>
            ))}
            {m.merchUrl && (
              <li className={row}>
                <Link
                  href="/merch"
                  className="flex items-baseline justify-between gap-4 text-bone transition-colors hover:text-accent"
                >
                  <span className="display-title text-base">Merch</span>
                  <span className="mono-label">official store →</span>
                </Link>
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="about-faq" className="flex flex-col gap-2">
          <h2 id="about-faq" className={heading}>
            Questions
          </h2>
          <dl>
            {m.faq.map(({ q, a }) => (
              <div key={q} className={`${row} flex flex-col gap-2`}>
                <dt className="font-serif text-xl text-bone">{q}</dt>
                <dd className="text-bone/70 leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {m.contact.length > 0 && (
          <section aria-labelledby="about-contact" className="flex flex-col gap-2">
            <h2 id="about-contact" className={heading}>
              Contact
            </h2>
            <dl>
              {m.contact.map((c) => (
                <div key={c.label} className={`${row} flex justify-between gap-4`}>
                  <dt className="mono-label">{c.label}</dt>
                  <dd>
                    <a href={`mailto:${c.email}`} className="text-bone hover:text-accent">
                      {c.email}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <Link
          href="/"
          className="flex items-center justify-between border border-bone/15 bg-bone px-5 py-4 text-void transition-colors hover:bg-accent"
        >
          <span className="display-title text-base">Enter the world</span>
          <span aria-hidden="true">→</span>
        </Link>
      </main>
    </>
  );
}
