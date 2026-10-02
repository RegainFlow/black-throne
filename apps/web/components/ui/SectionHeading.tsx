"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { type ReactNode, useRef } from "react";
import { world } from "@/lib/world-store";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

interface Props {
  index: string;
  title: string;
  kicker?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Section title that flickers on like a failing fluorescent tube when it scrolls in.
 * Rendered as plain text on the server; the effect is progressive.
 */
export function SectionHeading({ index, title, kicker, id, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (world.getState().reducedMotion) return;
      const heading = root.current?.querySelector("h2");
      if (!heading) return;
      let split: SplitText | undefined;
      // Split lazily, just before the heading is seen — no upfront DOM work during hydration.
      const trigger = ScrollTrigger.create({
        trigger: heading,
        start: "top 92%",
        once: true,
        onEnter: () => {
          split = SplitText.create(heading, { type: "chars" });
          const tl = gsap.timeline();
          // Each character stutters on a few times, then holds — under 3 flashes/s per glyph.
          for (const c of split.chars) {
            const d = Math.random() * 0.6;
            tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.05 }, d)
              .to(c, { opacity: 0.15, duration: 0.05 }, d + 0.1)
              .to(c, { opacity: 1, duration: 0.05 }, d + 0.42 + Math.random() * 0.3);
          }
          tl.fromTo(
            root.current?.querySelectorAll("[data-heading-meta]") ?? [],
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.1 },
            0.2,
          );
        },
      });
      return () => {
        trigger.kill();
        split?.revert();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`flex flex-col gap-4 ${className ?? ""}`}>
      <div data-heading-meta className="mono-label flex items-center gap-4">
        <span className="text-accent">{index}</span>
        <span aria-hidden="true" className="h-px w-12 bg-smoke/40" />
        {kicker}
      </div>
      <h2 id={id} className="display-title text-[clamp(2rem,6vw,5rem)] text-bone">
        {title}
      </h2>
    </div>
  );
}
