import type { PublicRelease, Site } from "@black-throne/content/types";
import { ReleaseCtas } from "@/components/media/ReleaseCtas";
import { ReleaseStatus } from "@/components/media/ReleaseStatus";
import { GlitchText } from "@/components/ui/GlitchText";
import { TransitionLink } from "@/components/ui/TransitionLink";

/** The throne room. The wordmark is server-rendered text — the LCP, painted before any WebGL. */
export function Hero({ site, latest }: { site: Site; latest: PublicRelease }) {
  return (
    <section
      aria-labelledby="wordmark"
      className="relative flex min-h-[100svh] flex-col items-center justify-center px-gutter pt-[var(--bt-nav-h)] text-center"
    >
      <h1 id="wordmark" className="type-wordmark text-bone">
        <GlitchText className="block pl-[0.28em] tracking-[0.28em] text-[clamp(2.6rem,12vw,10.5rem)] leading-[1.02] [text-shadow:0_0_40px_rgb(0_0_0/0.6)] md:hidden">
          Black
        </GlitchText>
        <GlitchText className="block pl-[0.28em] tracking-[0.28em] text-[clamp(2.6rem,12vw,10.5rem)] leading-[1.02] [text-shadow:0_0_40px_rgb(0_0_0/0.6)] md:hidden">
          Throne
        </GlitchText>
        <GlitchText className="hidden tracking-[0.28em] text-[clamp(2.75rem,6.6vw,7.75rem)] [text-shadow:0_0_40px_rgb(0_0_0/0.6)] md:inline-block md:pl-[0.28em]">
          Black Throne
        </GlitchText>
      </h1>

      <p className="mt-6 font-serif text-lg text-bone/60 italic md:text-xl">{site.tagline}</p>

      <div className="mt-16 flex flex-col items-center gap-5">
        <div aria-hidden="true" className="hairline w-40" />
        <TransitionLink
          href={`/chapters/${latest.slug}`}
          className="display-title text-xl text-bone transition-colors hover:text-accent md:text-2xl"
        >
          {latest.title}
        </TransitionLink>
        <ReleaseStatus visibility={latest.visibility} releaseDate={latest.releaseDate} />
        <div className="mt-3">
          <ReleaseCtas
            location="hero"
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
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
      >
        <span className="mono-label">descend</span>
        <span className="relative block h-14 w-px overflow-hidden bg-smoke/25">
          <span className="absolute top-0 left-0 h-4 w-px animate-[bt-descend_2.4s_var(--ease-weight)_infinite] bg-glow" />
        </span>
      </div>
    </section>
  );
}
