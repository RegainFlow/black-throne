"use client";

import type { GradeId } from "@black-throne/content/types";
import { useEffect, useRef, useState } from "react";
import { useWorld } from "@/lib/use-world";
import { world } from "@/lib/world-store";

const GLYPHS = "▓▒░█▚▞#/\\_";

/** Corner readouts: local time + a chapter line (scrambles between lines), and descent depth. */
export function Hud({ lines }: { lines: Partial<Record<GradeId, string[]>> }) {
  const grade = useWorld((s) => s.grade);
  const [clock, setClock] = useState("--:--:--");
  const lineRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const id = window.setInterval(() => setClock(fmt.format(new Date())), 1000);
    setClock(fmt.format(new Date()));
    return () => window.clearInterval(id);
  }, []);

  useEffect(
    () =>
      world.subscribe((s, prev) => {
        if (s.scroll === prev.scroll || !depthRef.current) return;
        depthRef.current.textContent = String(Math.round(s.scroll * 666)).padStart(3, "0");
      }),
    [],
  );

  useEffect(() => {
    const el = lineRef.current;
    const list = lines[grade] ?? lines.ii ?? [];
    if (!el || !list.length) return;
    const reduced = world.getState().reducedMotion;
    let i = 0;
    let timer = 0;
    let frame = 0;
    const show = (text: string) => {
      if (reduced) {
        el.textContent = text;
        return;
      }
      let n = 0;
      const total = 14;
      const step = () => {
        n++;
        const reveal = Math.floor((n / total) * text.length);
        el.textContent =
          text.slice(0, reveal) +
          Array.from(text.slice(reveal), (c) =>
            c === " " ? " " : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ""),
          ).join("");
        if (n < total) frame = window.setTimeout(step, 45);
      };
      step();
    };
    const cycle = () => {
      show(list[i % list.length] ?? "");
      i++;
      timer = window.setTimeout(cycle, 7000);
    };
    cycle();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(frame);
    };
  }, [grade, lines]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden px-gutter pb-5 md:block"
    >
      <div className="mono-label flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-bone/60 tabular-nums">{clock}</span>
          <span ref={lineRef} className="min-h-[1em]" />
        </div>
        <div className="flex items-center gap-3">
          <span className="block h-px w-10 bg-smoke/50" />
          <span>
            depth{" "}
            <span ref={depthRef} className="text-bone/70 tabular-nums">
              000
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
