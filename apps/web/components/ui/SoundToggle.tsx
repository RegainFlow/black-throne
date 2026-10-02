"use client";

import { useEffect, useRef } from "react";
import { audio } from "@/lib/audio-engine";
import { useWorld } from "@/lib/use-world";
import { world } from "@/lib/world-store";

/** SOUND on/off with five bars that dance to the analyser. */
export function SoundToggle({ className }: { className?: string }) {
  const sound = useWorld((s) => s.sound);
  const bars = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!sound) {
      for (const node of bars.current?.childNodes ?? []) {
        (node as HTMLElement).style.transform = "scaleY(0.12)";
      }
      return;
    }
    let raf = 0;
    const loop = () => {
      const el = bars.current;
      if (el) {
        const { low, mid, high, kick } = world.getState().bands;
        const values = [low + kick * 0.5, mid, (low + mid) / 2, high * 1.4, mid * 0.8];
        el.childNodes.forEach((node, i) => {
          const v = Math.min(1, 0.12 + (values[i] ?? 0) ** 2 * 1.1);
          (node as HTMLElement).style.transform = `scaleY(${v})`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sound]);

  return (
    <button
      type="button"
      aria-pressed={sound}
      onClick={() => void audio.toggle()}
      className={`mono-label group inline-flex items-center gap-2.5 transition-colors hover:text-bone ${className ?? ""}`}
    >
      <span ref={bars} aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`block h-full w-[2px] origin-bottom transition-colors ${sound ? "bg-accent" : "bg-smoke/60"}`}
            style={{ transform: "scaleY(0.12)" }}
          />
        ))}
      </span>
      <span>
        sound <span className={sound ? "text-bone" : ""}>{sound ? "on" : "off"}</span>
      </span>
    </button>
  );
}
