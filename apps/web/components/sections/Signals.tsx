import type { Site } from "@black-throne/content/types";
import { OutboundLink } from "@/components/ui/OutboundLink";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Where the world continues. Giant rows that invert on hover — every click is tracked. */
export function Signals({ site }: { site: Site }) {
  return (
    <section id="signals" aria-labelledby="signals-title" className="relative py-[14vh]">
      <div className="mx-auto max-w-7xl px-gutter">
        <SectionHeading
          index="03"
          id="signals-title"
          title="Signals"
          kicker={<span>follow the throne</span>}
        />
      </div>
      <ul className="mt-14 border-t border-bone/10">
        {site.socials
          .filter((s) => !s.placeholder)
          .map((s, i) => (
            <li key={s.platform} className="border-b border-bone/10">
              <OutboundLink
                href={s.url}
                platform={s.platform}
                location="signals"
                className="group relative flex items-center justify-between gap-6 overflow-hidden px-gutter py-6 md:py-9"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-0 origin-bottom scale-y-0 bg-bone transition-transform duration-700 ease-[var(--ease-weight)] group-hover:scale-y-100 group-focus-visible:scale-y-100"
                />
                <span className="relative flex items-baseline gap-6">
                  <span className="mono-label hidden text-accent sm:inline">0{i + 1}</span>
                  <span className="display-title text-[clamp(2rem,8vw,6.5rem)] leading-none text-bone transition-colors duration-500 group-hover:text-void">
                    {s.label}
                  </span>
                </span>
                <span className="mono-label relative flex items-center gap-4 transition-colors duration-500 group-hover:text-void">
                  <span className="hidden md:inline">{s.handle}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                  >
                    ↗
                  </span>
                </span>
              </OutboundLink>
            </li>
          ))}
      </ul>
    </section>
  );
}
