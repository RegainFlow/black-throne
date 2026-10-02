"use client";

import { gsap } from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Monogram } from "./Monogram";
import { SoundToggle } from "./SoundToggle";
import { TransitionLink } from "./TransitionLink";

const LINKS = [
  { id: "chapters", label: "chapters" },
  { id: "listen", label: "listen" },
  { id: "visions", label: "visions" },
  { id: "signals", label: "signals" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const base = pathname === "/" ? "" : "/";

  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    if (open) {
      gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
      gsap.fromTo(
        el.querySelectorAll("[data-menu-item]"),
        { y: 40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.07, duration: 0.9, ease: "power4.out" },
      );
    } else {
      gsap.to(el, { autoAlpha: 0, duration: 0.3 });
    }
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu whenever the route changes
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-[var(--bt-nav-h)] items-center justify-between bg-gradient-to-b from-void/85 via-void/40 to-transparent px-gutter">
        <TransitionLink
          href="/"
          aria-label="Black Throne — home"
          className="flex items-center gap-3 text-bone"
        >
          <Monogram className="h-12" />
        </TransitionLink>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <TransitionLink
              key={l.id}
              href={`${base}#${l.id}`}
              className="mono-label transition-colors hover:text-bone"
            >
              {l.label}
            </TransitionLink>
          ))}
          <span aria-hidden="true" className="h-3 w-px bg-smoke/40" />
          <SoundToggle />
        </nav>
        <div className="flex items-center gap-5 md:hidden">
          <SoundToggle />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="mono-label text-bone"
          >
            {open ? "close" : "menu"}
          </button>
        </div>
      </header>
      <div
        ref={menu}
        id="mobile-menu"
        className="invisible fixed inset-0 z-40 flex flex-col justify-center gap-6 bg-void/95 px-gutter backdrop-blur-sm md:hidden"
        aria-hidden={!open}
        inert={!open}
      >
        {LINKS.map((l, i) => (
          <TransitionLink
            key={l.id}
            href={`${base}#${l.id}`}
            data-menu-item
            onClick={() => setOpen(false)}
            className="display-title flex items-baseline gap-4 text-4xl text-bone"
          >
            <span className="mono-label text-accent">0{i + 1}</span>
            {l.label}
          </TransitionLink>
        ))}
      </div>
    </>
  );
}
