"use client";

import type Lenis from "lenis";

/** The single Lenis instance (absent under reduced motion / touch-first devices). */
let lenis: Lenis | undefined;

export function setLenis(instance: Lenis | undefined) {
  lenis = instance;
}

export function scrollToTarget(target: string | number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(target, { immediate, duration: 2.2, offset: 0 });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: immediate ? "instant" : "smooth" });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: immediate ? "instant" : "smooth" });
  }
}

export function stopScroll(stopped: boolean) {
  if (stopped) lenis?.stop();
  else lenis?.start();
}
