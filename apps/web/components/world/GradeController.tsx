"use client";

import { grades } from "@black-throne/content/grades";
import type { GradeId } from "@black-throne/content/types";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { world } from "@/lib/world-store";

const isGrade = (v: string | undefined): v is GradeId => Boolean(v && v in grades);

/**
 * Re-grades the world as you move through it. Any element with `data-grade-section="<grade>"`
 * takes over when it crosses the middle of the viewport; otherwise the page's
 * `main[data-page-grade]` applies. The html[data-grade] attribute drives the CSS tokens,
 * the store drives the WebGL uniforms.
 */
export function GradeController() {
  const pathname = usePathname();

  useEffect(() => {
    return world.subscribe((s, prev) => {
      if (s.grade !== prev.grade) document.documentElement.dataset.grade = s.grade;
    });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scan the DOM on every route change
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main[data-page-grade]");
    const pageGrade = isGrade(main?.dataset.pageGrade) ? main.dataset.pageGrade : "ii";
    world.getState().setGrade(pageGrade);
    document.documentElement.dataset.grade = pageGrade;
    // Enable colour transitions only after the first grade has been applied without one.
    const ready = requestAnimationFrame(() =>
      requestAnimationFrame(() => document.documentElement.classList.add("grade-ready")),
    );

    const sections = [...document.querySelectorAll<HTMLElement>("[data-grade-section]")];
    if (!sections.length) return () => cancelAnimationFrame(ready);
    const active = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) active.add(e.target as HTMLElement);
          else active.delete(e.target as HTMLElement);
        }
        const current = [...active].at(-1);
        const g = current?.dataset.gradeSection;
        world.getState().setGrade(isGrade(g) ? g : pageGrade);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    for (const s of sections) io.observe(s);
    return () => {
      cancelAnimationFrame(ready);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
