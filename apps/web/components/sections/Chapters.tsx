import type { Chapter } from "@black-throne/content/types";
import { ReleaseCard } from "@/components/chapters/ReleaseCard";
import { SealedSlot } from "@/components/chapters/SealedSlot";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The world's index. Each era is its own graded region — scrolling from I into II
 * re-tints the whole site. A veiled era shows a redaction bar instead of its title.
 */
export function Chapters({ chapters }: { chapters: Chapter[] }) {
  return (
    <section id="chapters" aria-labelledby="chapters-title" className="relative py-[14vh]">
      <div className="mx-auto max-w-7xl px-gutter">
        <SectionHeading
          index="01"
          id="chapters-title"
          title="Chapters"
          kicker={<span>every album is a different kind of weight</span>}
        />
      </div>

      <div className="mt-20 flex flex-col gap-[16vh]">
        {chapters.map(({ era, items }) => (
          <article
            key={era.id}
            data-grade-section={era.grade}
            aria-label={
              era.title
                ? `Chapter ${era.numeral}: ${era.title}`
                : `Chapter ${era.numeral}, not yet named`
            }
            className="mx-auto w-full max-w-7xl px-gutter"
          >
            <header className="mb-10 flex items-end gap-4 border-b border-bone/10 pb-6 sm:gap-6">
              {/* Decorative: rendered as generated content so it carries no text for AT or contrast checks. */}
              <span
                aria-hidden="true"
                data-numeral={era.numeral}
                className="display-title text-[clamp(3.5rem,11vw,9rem)] leading-none text-bone/15 before:content-[attr(data-numeral)]"
              />
              <div className="flex min-w-0 flex-col gap-2 pb-2">
                <span className="mono-label">chapter {era.numeral.toLowerCase()}</span>
                {era.title ? (
                  <span className="display-title text-2xl text-bone md:text-4xl">{era.title}</span>
                ) : (
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="block h-6 w-28 shrink bg-bone/80 sm:w-48 md:h-8 md:w-72 [clip-path:polygon(0_8%,100%_0,98%_92%,1%_100%)]"
                    />
                    <span className="mono-label">untitled</span>
                  </span>
                )}
              </div>
            </header>

            <ul
              className={`grid gap-6 ${
                items.length > 2
                  ? "grid-cols-2 md:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-2 md:max-w-4xl"
              }`}
            >
              {items.map((item) => (
                <li key={item.type === "release" ? item.release.slug : item.slot.id}>
                  {item.type === "release" ? (
                    <ReleaseCard
                      release={item.release}
                      sizes={
                        items.length > 2
                          ? "(min-width: 768px) 22vw, 45vw"
                          : "(min-width: 768px) 40vw, 90vw"
                      }
                    />
                  ) : (
                    <SealedSlot slot={item.slot} />
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
