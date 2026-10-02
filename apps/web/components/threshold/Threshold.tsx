"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { Monogram } from "@/components/ui/Monogram";
import { trackEvent } from "@/lib/analytics";
import { audio } from "@/lib/audio-engine";
import { stopScroll } from "@/lib/scroll";
import { world } from "@/lib/world-store";

import { SESSION_KEY } from "./script";

/**
 * The entry ritual. Only visible when the inline <head> script set html[data-threshold]
 * (first visit this session, motion allowed, JS on) — so no-JS visitors and crawlers
 * get the hero directly, and nothing flashes.
 */
export function Threshold({ line, hasTeaser }: { line: string; hasTeaser: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const done = useRef(false);
  const enterRef = useRef<(withSound: boolean) => void>(() => {});

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current;
    if (!el || !html.hasAttribute("data-threshold")) return;
    world.getState().setIntro("threshold");
    stopScroll(true);

    const chars = lineRef.current ? [...lineRef.current.querySelectorAll("[data-char]")] : [];
    const tl = gsap.timeline({ delay: 0.4 });
    tl.fromTo(
      "[data-th-wordmark]",
      // transform + filter only: letter-spacing tweens force a layout every frame
      { autoAlpha: 0, scale: 1.08, filter: "blur(8px)" },
      {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 2.4,
        ease: "power3.out",
      },
    )
      .fromTo(
        "[data-th-sigil]",
        { autoAlpha: 0, scale: 0.92 },
        { autoAlpha: 1, scale: 1, duration: 2, ease: "power2.out" },
        "-=1.6",
      )
      .fromTo(chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.045 }, "-=0.6")
      .fromTo(
        "[data-th-actions] > *",
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.15,
          duration: 1,
          ease: "power3.out",
          onComplete: () =>
            el.querySelector<HTMLButtonElement>("[data-th-actions] button")?.focus(),
        },
        "+=0.2",
      );

    const breath = gsap.to("[data-th-sigil-glow]", {
      opacity: 0.9,
      scale: 1.08,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") enterRef.current(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      tl.kill();
      breath.kill();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  enterRef.current = enter;
  function enter(withSound: boolean) {
    if (done.current) return;
    done.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // private mode — the threshold will simply show again next visit
    }
    // Must run synchronously inside the click: creates/resumes the AudioContext.
    if (withSound) void audio.enable(true);
    trackEvent("enter", { sound: withSound });
    const s = world.getState();
    s.burst();
    s.setIntro("entering");

    gsap
      .timeline({
        onComplete: () => {
          document.documentElement.removeAttribute("data-threshold");
          stopScroll(false);
          window.setTimeout(() => world.getState().setIntro("world"), 1800);
        },
      })
      .to("[data-th-actions], [data-th-line]", { autoAlpha: 0, duration: 0.4 })
      .to(
        "[data-th-sigil]",
        { scale: 1.6, autoAlpha: 0, filter: "blur(14px)", duration: 1.3, ease: "power3.in" },
        0,
      )
      .to(
        "[data-th-wordmark]",
        {
          autoAlpha: 0,
          scale: 1.25,
          filter: "blur(12px)",
          duration: 1.3,
          ease: "power3.in",
        },
        0.1,
      )
      .to(root.current, { autoAlpha: 0, duration: 1.1, ease: "power2.inOut" }, 0.9);
  }

  return (
    <div
      ref={root}
      data-threshold-root
      role="dialog"
      aria-modal="true"
      aria-label="Enter the world of Black Throne"
      className="fixed inset-0 z-[80] flex-col items-center justify-center bg-void px-gutter text-center"
    >
      <p
        data-th-wordmark
        className="type-wordmark invisible text-[clamp(1rem,3.4vw,1.75rem)] text-bone"
      >
        Black Throne
      </p>

      <div
        data-th-sigil
        className="invisible relative my-10 flex h-[34svh] max-h-80 items-center justify-center"
      >
        <span
          data-th-sigil-glow
          aria-hidden="true"
          className="absolute inset-0 m-auto size-48 rounded-full bg-glow/10 opacity-40 blur-3xl will-change-transform"
        />
        <Monogram className="relative h-full text-bone/90" />
      </div>

      <p
        ref={lineRef}
        data-th-line
        className="mono-label min-h-[1.5em] max-w-[46ch] text-sm text-bone/70"
      >
        {Array.from(line).map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static characters of a fixed string
          <span key={i} data-char className="invisible">
            {c}
          </span>
        ))}
      </p>

      <div data-th-actions className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-10">
        <button
          type="button"
          onClick={() => enter(true)}
          className="invisible display-title border border-bone/25 px-6 py-3 text-xs text-bone transition-colors hover:border-accent hover:text-accent"
        >
          enter with sound
        </button>
        <button
          type="button"
          onClick={() => enter(false)}
          className="invisible display-title px-6 py-3 text-xs text-smoke transition-colors hover:text-bone"
        >
          enter in silence
        </button>
        <span className="invisible mono-label sm:hidden">
          {hasTeaser ? "headphones recommended" : ""}
        </span>
      </div>

      <p className="mono-label absolute bottom-6 hidden sm:block">
        {hasTeaser ? "headphones recommended · " : ""}esc to skip
      </p>
    </div>
  );
}
