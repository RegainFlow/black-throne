import type { PublicRelease, Site } from "@black-throne/content/types";
import { Monogram } from "@/components/ui/Monogram";
import { TransitionLink } from "@/components/ui/TransitionLink";

export function Footer({ site, releases }: { site: Site; releases: PublicRelease[] }) {
  return (
    <footer className="relative flex flex-col items-center gap-8 px-gutter pt-[16vh] pb-24 text-center">
      <Monogram className="h-40 text-bone/70" />
      <p className="font-serif text-2xl text-bone/70 italic">{site.tagline}</p>
      {/* The one plain sentence saying who this is: the crawlable answer to "Black Throne?". */}
      <p className="max-w-xl font-serif text-lg text-bone/50 leading-relaxed">{site.description}</p>
      <nav aria-label="Footer" className="mono-label flex flex-wrap justify-center gap-6">
        {releases.map((r) => (
          <TransitionLink key={r.slug} href={`/chapters/${r.slug}`} className="hover:text-bone">
            {r.title.toLowerCase()}
          </TransitionLink>
        ))}
        {site.merch.enabled && (
          <TransitionLink href="/merch" className="hover:text-bone">
            merch
          </TransitionLink>
        )}
        <TransitionLink href="/about" className="hover:text-bone">
          about
        </TransitionLink>
        <TransitionLink href="/links" className="hover:text-bone">
          all links
        </TransitionLink>
      </nav>
      <p className="mono-label">© {new Date().getFullYear()} black throne</p>
    </footer>
  );
}
