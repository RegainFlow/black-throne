"use client";

import { type ElementType, type ReactNode, useEffect, useRef } from "react";
import { world } from "@/lib/world-store";

interface Props {
  children: string;
  as?: ElementType;
  className?: string;
  /** Seconds between bursts (randomised within the range). */
  every?: [number, number];
  /** Extra content rendered after the text (not glitched). */
  after?: ReactNode;
}

/**
 * Text with rare RGB-split slice glitches. One burst lasts ~200ms and bursts are
 * 8–15s apart by default — far below the WCAG 2.3.1 three-flashes-per-second limit.
 */
export function GlitchText({
  children,
  as: Tag = "span",
  className,
  every = [8, 15],
  after,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [min, max] = every;

  useEffect(() => {
    const el = ref.current;
    if (!el || world.getState().reducedMotion) return;
    let timer = 0;
    let frame = 0;

    const burst = () => {
      let steps = 3 + Math.floor(Math.random() * 3);
      const tick = () => {
        if (steps-- <= 0) {
          el.dataset.glitching = "false";
          schedule();
          return;
        }
        const r = () => `${Math.floor(Math.random() * 70)}%`;
        el.style.setProperty("--g-a-top", r());
        el.style.setProperty("--g-a-bot", r());
        el.style.setProperty("--g-b-top", r());
        el.style.setProperty("--g-b-bot", r());
        el.style.setProperty("--g-shift", `${(Math.random() - 0.5) * 0.06}em`);
        el.dataset.glitching = "true";
        frame = window.setTimeout(tick, 40 + Math.random() * 30);
      };
      tick();
    };
    const schedule = () => {
      timer = window.setTimeout(burst, (min + Math.random() * (max - min)) * 1000);
    };
    // kicks in the audio make it glitch too
    let lastKick = 0;
    const unsub = world.subscribe((s) => {
      const now = performance.now();
      if (s.bands.kick > 0.55 && now - lastKick > 1400 && el.dataset.glitching !== "true") {
        lastKick = now;
        window.clearTimeout(timer);
        burst();
      }
    });
    schedule();
    return () => {
      unsub();
      window.clearTimeout(timer);
      window.clearTimeout(frame);
    };
  }, [min, max]);

  return (
    <Tag ref={ref} className={`bt-glitch ${className ?? ""}`} data-glitching="false">
      <span className="bt-glitch__base inline-block">{children}</span>
      <span aria-hidden="true" className="bt-glitch__layer bt-glitch__layer--a">
        {children}
      </span>
      <span aria-hidden="true" className="bt-glitch__layer bt-glitch__layer--b">
        {children}
      </span>
      {after}
    </Tag>
  );
}
