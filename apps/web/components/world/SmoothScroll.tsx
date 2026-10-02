"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis } from "@/lib/scroll";
import { world } from "@/lib/world-store";

gsap.registerPlugin(ScrollTrigger);

/** Weighted smooth scroll (Lenis) wired into GSAP's ticker + ScrollTrigger. Off for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    const publish = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      world.setState({ scroll: max > 0 ? window.scrollY / max : 0 });
    };

    if (world.getState().reducedMotion) {
      window.addEventListener("scroll", publish, { passive: true });
      return () => window.removeEventListener("scroll", publish);
    }

    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => 1 - (1 - t) ** 4,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
    });
    setLenis(lenis);
    lenis.on("scroll", () => {
      ScrollTrigger.update();
      publish();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(undefined);
    };
  }, []);

  return null;
}
