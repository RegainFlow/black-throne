"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { world } from "@/lib/world-store";

/** Ember dot + lagging ring; becomes [ brackets ] over anything interactive. Fine pointers only. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const d = dot.current;
    const r = ring.current;

    const onMove = (e: PointerEvent) => {
      world.setState({
        pointer: {
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
          active: true,
        },
      });
    };
    const onLeave = () =>
      world.setState({ pointer: { ...world.getState().pointer, active: false } });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    if (!fine || !d || !r || world.getState().reducedMotion) {
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    }

    document.documentElement.classList.add("has-cursor");
    const dx = gsap.quickTo(d, "x", { duration: 0.08 });
    const dy = gsap.quickTo(d, "y", { duration: 0.08 });
    const rx = gsap.quickTo(r, "x", { duration: 0.55, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.55, ease: "power3" });
    const move = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      gsap.to([d, r], { autoAlpha: 1, duration: 0.3, overwrite: "auto" });
    };
    const over = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest("a, button, [data-cursor]");
      r.dataset.state = target ? "target" : "idle";
    };
    const hide = () => gsap.to([d, r], { autoAlpha: 0, duration: 0.3 });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);

    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        aria-hidden="true"
        className="pointer-events-none invisible fixed top-0 left-0 z-[90] -mt-[2px] -ml-[2px] size-1 rounded-full bg-glow shadow-[0_0_10px_2px] shadow-glow/60"
      />
      <div
        ref={ring}
        aria-hidden="true"
        data-state="idle"
        className="group pointer-events-none invisible fixed top-0 left-0 z-[90] -mt-5 -ml-5 size-10 transition-[width,height,margin] duration-500 data-[state=target]:-mt-7 data-[state=target]:-ml-7 data-[state=target]:size-14"
      >
        <span className="absolute inset-0 rounded-full border border-bone/25 transition-opacity duration-300 group-data-[state=target]:opacity-0" />
        <span className="absolute inset-y-0 left-0 w-2 border-y border-l border-accent opacity-0 transition-opacity duration-300 group-data-[state=target]:opacity-100" />
        <span className="absolute inset-y-0 right-0 w-2 border-y border-r border-accent opacity-0 transition-opacity duration-300 group-data-[state=target]:opacity-100" />
      </div>
    </>
  );
}
