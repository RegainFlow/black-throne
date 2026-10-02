"use client";

import { gsap } from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Monogram } from "@/components/ui/Monogram";
import { scrollToTarget } from "@/lib/scroll";
import { transition } from "@/lib/transition";
import { world } from "@/lib/world-store";

/** Ash curtain: rises to cover, the route changes underneath, then it keeps rising away. */
export function TransitionOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { yPercent: 110, autoAlpha: 0 });
    transition.setState({ overlay: true, phase: "idle", href: undefined });
    const unsub = transition.subscribe((s, prev) => {
      if (s.phase === "covering" && prev.phase !== "covering") {
        world.getState().burst();
        gsap.fromTo(
          el,
          { yPercent: 110, autoAlpha: 1 },
          {
            yPercent: 0,
            duration: 0.75,
            ease: "power4.inOut",
            onComplete: () => transition.setState({ phase: "covered" }),
          },
        );
      }
    });
    return () => {
      unsub();
      // Leaving the world (e.g. to /links): never strand the store mid-transition.
      transition.setState({ overlay: false, phase: "idle", href: undefined });
    };
  }, []);

  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    const el = ref.current;
    if (!el || transition.getState().phase !== "covered") return;
    const hash = transition.getState().href?.split("#")[1];
    // Wait a frame so the new route is in the DOM before jumping to its anchor.
    requestAnimationFrame(() => scrollToTarget(hash ? `#${hash}` : 0, true));
    transition.setState({ phase: "revealing" });
    gsap.to(el, {
      yPercent: -110,
      duration: 0.9,
      delay: 0.15,
      ease: "power4.inOut",
      onComplete: () => {
        gsap.set(el, { yPercent: 110, autoAlpha: 0 });
        transition.setState({ phase: "idle", href: undefined });
      },
    });
  }, [pathname]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 -inset-y-[12vh] z-[75] invisible flex items-center justify-center bg-void"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0, black 10vh, black calc(100% - 10vh), transparent 100%)",
      }}
    >
      <div className="absolute inset-x-0 top-[10vh] h-px bg-glow/70 shadow-[0_0_24px_4px] shadow-glow/40" />
      <div className="absolute inset-x-0 bottom-[10vh] h-px bg-glow/40" />
      <Monogram className="h-24 text-bone/30" />
    </div>
  );
}
